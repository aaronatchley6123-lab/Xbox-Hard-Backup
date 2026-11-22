# Xbox Series X OneCore Architecture & Hypervisor Exploitation Dossier
**Target Platform:** Xbox Series X (Project Anaconda APU - Project Scarlett)  
**Host Architecture:** AMD Zen 2 (8C/16T @ 3.8 GHz) + RDNA 2 (52 CUs @ 1.825 GHz, 12.15 TFLOPS) + 16GB GDDR6  
**Kernel Substrate:** Microsoft Windows OneCore 24H2 (`10.0.26100.9445`)  
**Network Topology:** Dual Virtual NIC: HostOS `<XBOX_HOST_IP>` (`minwinpc`) | SRA `<XBOX_SRA_IP>` (`XBOX`)  
**Access Context:** `DevToolsUser` (Medium Integrity) with Unrestricted Native x64 Execution (`Bit 26: 0x04000000`)

---

## 1. Executive Summary & Architectural Overview

The Xbox Series X security and execution model relies on hardware AMD-V (SVM) virtualization managed by the proprietary Microsoft Xbox Hypervisor (`hv.exe` / NanoVisor). Rather than running a single unified operating system, the hardware is segmented into three distinct Virtual Machine partitions:

1. **HostOS / SystemOS (`VmId 0`):**
   - Mapped to `C:\` (HostOS root) and `M:\` (System OS Misc).
   - Bare OneCore 24H2 (`10.0.26100.9445`) kernel foundation with zero consumer desktop overhead.
   - Directly manages hardware resources, device drivers (`J:\drivers`), filesystem filter drivers (`xrfs.sys`), and hypervisor control endpoints (`\\.\xvmctrl`).
2. **SRA - Shared Resource Architecture (`VmId 1`):**
   - Mapped to `D:\` (DevelopmentFiles) and `Q:\` (User Storage).
   - The user/app execution context where developer mode tools, native Win32 processes, and the Hermes bridge operate.
3. **ERA - Exclusive Resource Architecture (`VmId 2`):**
   - Dedicated game runtime partition allocated 13.5GB+ of high-speed GDDR6 and 52 CUs of the RDNA 2 GPU.

---

## 2. Boot Capability Certificates & The `0x6001` Profile

### 2.1 The Role of `certkeys.bin`
During cold boot, the **AMD Platform Security Processor (PSP)** reads `certkeys.bin` from the encrypted/signed **XBFS (Xbox Boot File System)** partition on internal NVMe storage before releasing x86 CPU cores:

* **`0x2001` (Consumer / UWA Devkit):** Standard retail console transitioned into Developer Mode. Enables SRA execution with loose sandboxing.
* **`0x4001` (ERA Studio Devkit):** Licensed studio development kit profile. Unlocks the ERA (GameOS) VM partition for retail game development, GDK profiling, and PIX debugging.
* **`0x6001` (Microsoft Internal Devkit / *TheArchitect*):** Unrestricted Microsoft internal profile. Enables low-level hypervisor debugging, cross-partition focus arbitrary switching, and root/SYSTEM telnet shells across all 3 partitions (HostOS, GameOS, and SystemOS).

### 2.2 Live Capability Extraction via `xpal.dll`
Using direct software calls into `C:\Windows\System32\xpal.dll` on the console, live silicon state was verified:

```
============================================================
   NATIVE XPAL HYPERVISOR & HARDWARE TELEMETRY
============================================================
[*] XpalIsInternalDevkit        : False
[*] XpalIsExternalDevkit        : True
[*] XpalIsGen8                  : False
[*] XpalIsGen9                  : True (Project Scarlett / Anaconda)
[*] XpalIsHyperV                : False (Native Xbox NanoVisor)
[*] XpalIsSilentBootMode        : False
[*] XpalGetConsoleMode          : 0x64 (100 = Dev Mode Hybrid)
[*] XpalGetGenerationType       : 0x9 (Scarlett Series X)
[*] XpalGetServerType           : 0x4000000 (67108864)
[*] XpalGetSystemType           : 0x64 (100)
[*] XpalGetVmType               : 0x2 (ERA / Dev mapping)
[*] XpalGetSouthBridgeType      : 0x2 (Anaconda Southbridge ASIC M1034001)
[*] XpalGetCapabilities         : 0x4000005 (67108869)
[*] Active Capability Bits       : [0, 2, 26]
```

#### Decoded Capability Bits (`0x04000005`):
* **Bit 0 (`0x00000001`):** `DEVELOPER_MODE_ENABLED`
* **Bit 2 (`0x00000004`):** `SRA_PARTITION_ISOLATION`
* **Bit 26 (`0x04000000`):** `NATIVE_WIN32_UNRESTRICTED_EXECUTION` (Allows unrestricted `CreateProcessA` calls outside AppContainer).

---

## 3. "Soft" Hardware Interrogation vs Physical Headers

### 3.1 Hardware UART & Diagnostic Interfaces
The physical Project Anaconda motherboard routes serial and diagnostic signals through the Southbridge ASIC (M1034001):
* **Header J22 (FACET):** 2x13 surface header providing Southbridge I2C (SDA/SCL) and diagnostic telemetry.
* **Header J20 (Nexus):** 10-pin hardware debug and JTAG/UART interface (3.3V LVTTL @ 38,400 / 115,200 baud).

### 3.2 Pure Software Equivalents
Physical probing is bypassed through the 50 exported functions of `C:\Windows\System32\xpal.dll`:
* `XpalGetSmcFirmwareId`: Queries the System Management Controller (SMC) firmware revision without hardware bus sniffing.
* `XpalGetSouthBridgeType`: Returns the live Southbridge ASIC silicon revision (`0x2`).
* `XpalGetConsoleCertificate`: Reads the active boot capability certificate structure directly from hypervisor memory.
* `XpalGetHostOsInformation` / `XpalGetTitleOsInformation`: Retrieves HostOS and TitleOS runtime structures.
* `XpalGetXConfig` / `XpalSetXConfig`: System configuration interface.

---

## 4. Hypervisor Driver Control & IOCTL Primitive (`\\.\xvmctrl`)

Low-level hypervisor communication is routed through the kernel driver `\\.\xvmctrl` (`xvmctrl.sys`):

| IOCTL Code | Control Macro | Status | Function |
| :--- | :--- | :--- | :--- |
| `0x0015010C` | `IOCTL_XVM_STATE_SIGNAL` | **0x00000000** | Direct partition signaling & state transitions |
| `0x00150114` | `IOCTL_XVM_HARDWARE_STATS` | **0x00000000** | Raw hardware performance & CPU/GPU counters |
| `0x00150178` | `IOCTL_XVM_RESOURCE_BOUNDARY` | **0x00000000** | Queries hypervisor memory boundary maps |
| `0x00150280` | `IOCTL_XVM_HOLDING_PARTITION`| **0x00000000** | Manages partition suspension / holding buffers |
| `0x00150298` | `IOCTL_XVM_TELEMETRY` | **0x00000000** | Hypervisor telemetry data harvest |

---

## 5. Software Authority & Captive Portal DNS Responder

To bypass external server authorization checks and ensure network-dependent services proceed smoothly, a local software authority stack was implemented:

1. **UDP Port 53 (Local DNS Responder):**
   - Intercepts all outgoing DNS queries from the console.
   - Automatically answers with an `A` record pointing to the local SRA interface (`<XBOX_SRA_IP>`), guaranteeing resolution without external internet dependencies.
2. **TCP Port 80 (HTTP Captive Portal / Auth Responder):**
   - Responds to `msftconnecttest.com/connecttest.txt` with `Microsoft Connect Test` (`HTTP 200 OK`).
   - Responds to all other HTTP endpoint queries with `HTTP 200 PROCEED` (`Gateway Authorized: PROCEED`).
3. **Boot Persistence:**
   - Injected into `D:\unattend.cmd` for cold-boot persistence alongside `hermes_bridge.py` (Port 1984) and the desktop web engine (Port 8080).

---

## 6. The `M:\` SystemOS Minimal Landscape

`M:\` (`System OS Misc`) represents a stripped-down, bloat-free distribution of Windows OneCore 24H2:
* **Footprint:** Contains only essential kernel libraries (`ntoskrnl.exe`, `ntdll.dll`, `kernelbase.dll`, `rpcrt4.dll`, `ws2_32.dll`) and hardware drivers.
* **Graphics:** Direct3D 12 low-level hardware user-mode driver (`umd12ddi_arden.dll`) and kernel scheduler (`xgpudx.sys`).
* **Custom OS Advantage:** Provides an ideal bare-metal runtime for launching custom user shells, headless LLM runners (DeepSeek-R1-Distill on Zen 2 CPU cores), and native Win32/Direct3D applications with near-zero OS latency.
