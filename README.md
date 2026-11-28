# Xbox Series X (Scarlett) — Bare-Metal Hardware Control & Hypervisor Exploitation Suite

An end-to-end framework for bare-metal hardware acquisition, hypervisor containment release, low-level NVRAM direct programming, storage filter neutralization, and telemetry orchestration on the **Xbox Series X** (AMD Scarlett Custom APU, OneCore 24H2 Build `10.0.26100.9445`).

> **Core Philosophy:** This project is **not** a Windows desktop port or user-mode skinning experiment. It is a low-level hardware dominance chain designed to break hypervisor resource quarantines, program bare-metal APU registers and NVRAM flags, neutralize kernel filesystem filters, and orchestrate unrestricted hardware execution via a dedicated Linux workstation.

---

## 🎯 Architecture Overview & Hardware Target

- **Hardware Platform:** Xbox Series X Devkit (`XBXOWNED`)
- **System-on-Chip (SoC):** Custom AMD Scarlett APU (Zen 2 8-Core / 16-Thread CPU, RDNA 2 GPU with 52 CUs)
- **Memory Architecture:** 16 GB GDDR6 Unified Memory Architecture (UMA)
- **Hypervisor Architecture:** Multi-VM partitioning managed by the Xbox Virtual Machine Monitor (`xvm.sys` / `xvmctrl`):
  - **Host VM (VmId 0):** Root hypervisor host managing hardware allocations and boundary enforcement.
  - **System Resource Allocation (SRA / VmId 1):** Shared system OS, background daemons, and developer toolchain.
  - **Exclusive Resource Allocation (ERA / VmId 2):** High-priority game execution VM with isolated hardware dispatch rings.
- **Operating System Base:** Windows OneCore 24H2 (Build `10.0.26100.9445`, `Windows.Xbox` device family).

---

## ⚡ The Bare-Metal Exploitation Chain

The complete execution sequence moves step-by-step from raw hypervisor IOCTL dispatch to unrestricted hardware orchestration:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Hypervisor Quarantine Release (\\.\xvmctrl)                   │
│   • IOCTL_XVM_HOLDING_PARTITION (0x00150280, in=0)                     │
│   • Releases hypervisor memory holding pool to reclaim physical RAM    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Firmware & NVRAM Slot Direct Programming (xpal.dll)           │
│   • Slot 0xAB  -> 0xC8 (200): Unrestricted hardware bus profiling     │
│   • Slot 0x112 -> 1: Privileged SystemOS execution mode                │
│   • IO 27 (HDMI) -> 0 & IO 39 (Power) -> 0: Release state latching     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Storage Subsystem & XRO Filter Neutralization                 │
│   • FSCTL_XRO_DISPOSITION_OVERRIDE (Unlock C:\ -> S_OK 0x00000000)     │
│   • DirectStorage IoRing DMA verification (572+ MB/s hardware bus)     │
│   • AllDrives NTFS junctions exposed across all 13 physical partitions │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Cold-Boot Unattended Automation & SYSTEM Persistence          │
│   • XboxDevService.exe scans \*.xboxunattend via DevGetObjects()       │
│   • Dispatches D:\setup.xboxunattend as NT AUTHORITY\SYSTEM on boot    │
│   • WinRT UnattendedUtilities arms persistent cold-boot recovery       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Native Shell Display Preservation (DevHome)                   │
│   • Prevents HDMI blackouts (avoiding broken desktop explorer shell)   │
│   • Injects WDP toolwindow overlay into native DevHome compositor      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 6: Linux AI Studio Control Station (Port 3000)                   │
│   • Real-time process tree monitor & remote memory peek/poke           │
│   • Live ETW debugging, partition dumping, and raw telemetry           │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Hypervisor Quarantine Release (`\\.\xvmctrl`)
On retail and developer hardware, the Microsoft hypervisor (`xvm.sys`) enforces memory quarantine on unallocated physical address spaces via the **Holding Partition**. By communicating directly with the `\\.\xvmctrl` kernel device:
- **`IOCTL_XVM_HOLDING_PARTITION` (`0x00150280`)**: Passing an input buffer of zero (`in=0`) commands the hypervisor to release the holding partition latch, unlocking the isolated physical RAM and making it addressable.
- **`IOCTL_XVM_STATE_SIGNAL` (`0x0015010C`) & `IOCTL_XVM_RESOURCE_BOUNDARY` (`0x00150178`)**: Signals the hypervisor scheduler to synchronize resource boundaries across VmIds `0` (Host), `1` (SRA), and `2` (ERA).

*Implementation:* [`local_docs_and_source/vmm_full_control.py`](file:///home/nitrokali/Xbox-Hard-Backup/local_docs_and_source/vmm_full_control.py), [`local_docs_and_source/xvm.c`](file:///home/nitrokali/Xbox-Hard-Backup/local_docs_and_source/xvm.c).

---

### Phase 2: Firmware & NVRAM Configuration (`xpal.dll`)
Using the Xbox Platform Abstraction Layer (`xpal.dll`) exports (`XpalSetXConfig`), the hardware configuration registers in non-volatile flash (NVRAM) are armed:
- **Slot `0xAB` $\rightarrow$ `0xC8` (200):** Overrides manufacturing restrictions, enabling unrestricted kernel profiling and hardware telemetry interfaces.
- **Slot `0x112` $\rightarrow$ `1` (`0x01, 0x00, 0x00, 0x00`):** Sets the execution transform mode flag, permitting privileged execution in SystemOS.
- **Slot `0x27` (HDMI) $\rightarrow$ `0` & Slot `0x39` (Power) $\rightarrow$ `0`:** Resets hardware IO release states to ensure HDMI stability across reboots.

*Implementation:* [`breakthrough_scripts/set_xconfig.py`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/set_xconfig.py), [`breakthrough_scripts/set_mfg_id.py`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/set_mfg_id.py).

---

### Phase 3: Storage Subsystem & XRO Filter Neutralization
The Xbox storage stack relies on `xrofilter.dll` / `XRO.SYS` (Xbox Read-Only filter driver) to prevent modifications to system partitions.
- **`FSCTL_XRO_DISPOSITION_OVERRIDE`:** Bypasses write locks on the boot partition (`C:\`), returning `0x00000000` (`S_OK`).
- **DirectStorage IoRing DMA:** Direct asynchronous storage ring execution (`ioring_benchmark.exe`) achieves verified transfer rates exceeding **572 MB/s** directly over the NVMe controller without filesystem abstraction penalties.
- **AllDrives Partition Federation:** NTFS junction points link all 13 physical and logical partitions into `D:\DevelopmentFiles\AllDrives\`, granting full browsing and extraction rights through Windows Device Portal (WDP).

*Implementation:* [`breakthrough_scripts/box_xro_directories.py`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/box_xro_directories.py), [`breakthrough_scripts/setup_wdp_junctions.py`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/setup_wdp_junctions.py).

---

### Phase 4: Cold-Boot Unattended Automation & SYSTEM Persistence (`*.xboxunattend`)
To achieve true bare-metal dominance that survives power cycles without requiring interactive user login or network dependency, the boot chain utilizes the native Xbox setup automation subsystem:
- **Discovery & Architecture:** The out-of-process system service `XboxDevService.exe` (`M:\windows\system32\XboxDevService.exe`) executes at boot time as `NT AUTHORITY\SYSTEM`. During initial hardware enumeration, it invokes `DevGetObjects(DevObjectTypeDeviceInterface)` to scan the root directory of all attached internal and external drives (`D:\`, USB mass storage `E:\`) for matching `\*.xboxunattend` files.
- **Root Dispatch Handler (`setup.xboxunattend`):** When `XboxDevService.exe` detects `D:\setup.xboxunattend` or `E:\setup.xboxunattend`, it triggers `DoCreateProcessForUnattendedScript`, launching the batch script directly with full `SYSTEM` privileges before the shell or user session initializes.
- **The Payload Execution Sequence:**
  1. Installs the custom root certificate authority (`TheArchitect.cer`) into the system store.
  2. Dispatches `vmm_full_control.py` to issue `IOCTL_XVM_HOLDING_PARTITION` (`in=0`), reclaiming quarantined physical memory.
  3. Executes `box_xro_directories.py` to override `XRO.SYS` filesystem write filters.
  4. Spawns the background Hermes kernel bridge (`hermes_bridge.py`) listening on `TCP 0.0.0.0:1984` with breakaway job creation flags.
  5. Chains execution into `unattend.cmd` for loopback exemption and overlay registration.
- **WinRT Arming Interface (`arm_oobe.py`):** The unattended search trigger is controlled via the `Microsoft.Xbox.Development.UnattendedUtilities` WinRT class (`IUnattendedUtilitiesStatics` GUID `de87ad07-75dc-4eec-9226-5628e98b9914`):
  - `put_ShouldRunOobeScript(1)` — Enables unattended script execution on cold boot.
  - `put_ShouldBlockUsb(0)` — Enables zero-touch auto-execution from external USB rescue flash drives (`E:\setup.xboxunattend`).
  - `put_ShouldBlockUnattend(0)` — Clears any administrative execution blockers.

*Implementation:* [`xbox_d_root/setup.xboxunattend`](file:///home/nitrokali/Xbox-Hard-Backup/xbox_d_root/setup.xboxunattend), [`breakthrough_scripts/unattend.cmd`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/unattend.cmd), [`local_docs_and_source/arm_oobe.py`](file:///home/nitrokali/Xbox-Hard-Backup/local_docs_and_source/arm_oobe.py), [`local_docs_and_source/setup_xboxunattend_discovery_breakdown.md`](file:///home/nitrokali/Xbox-Hard-Backup/local_docs_and_source/setup_xboxunattend_discovery_breakdown.md).

---

### Phase 5: Native Shell Display Preservation
Earlier attempts to force standard Windows desktop shells (`explorer.exe` / `cmd.exe` shell redirection via Winlogon) cause catastrophic display failure:
- OneCore on Scarlett lacks standard desktop compositing libraries (DWM desktop hooks).
- Replacing the shell breaks the hardware HDMI presentation pipeline and crashes the display driver.
- **The Solution:** The native **DevHome shell** is preserved intact on HDMI. Low-level orchestration, custom toolwindows, and WDP extensions are injected into DevHome as an overlay, leaving HDMI video output 100% stable while running all background daemons.

*Implementation:* [`breakthrough_scripts/patch_devhome_wdp_ui.py`](file:///home/nitrokali/Xbox-Hard-Backup/breakthrough_scripts/patch_devhome_wdp_ui.py).

---

### Phase 6: Linux AI Studio Control Station
Control of the console is exercised remotely from a Linux workstation running the **AI Studio Web Controller** (`ai_studio_webui`):
- Runs on `http://0.0.0.0:3000` via Express + Vite + React 19.
- Connects directly to console OpenSSH (`port 22`), WDP (`port 11443`), and Hermes Hypervisor Bridge (`port 1984`).
- **Capabilities:**
  - Live process monitor & remote termination.
  - Interactive memory peek/poke and register inspection.
  - Real-time ETW event stream decoding.
  - Multi-partition file exploration across all 13 drives.
  - Hardware pinout guide and serial/UART debugger.

*Implementation:* [`ai_studio_webui/`](file:///home/nitrokali/Xbox-Hard-Backup/ai_studio_webui/).

---

## 💽 Bare-Metal Partition & Drive Map

With `SeBackupPrivilege` and `SeRestorePrivilege` active, all 13 logical/physical volumes are un-gated:

| Drive | Role | Filesystem | Bare-Metal Contents & Purpose |
| :---: | :--- | :---: | :--- |
| **`C:\`** | System Boot | NTFS | Core OS kernel (`ntoskrnl.exe`), drivers, security catalogs |
| **`D:\`** | Development | NTFS | Development files, scripts, toolchain, Python runtime |
| **`E:\`** | External Media | FAT32 | USB flash drives & offline deployment media |
| **`G:\`** | GameDVR Buffer | NTFS | Raw audio/video capture circular scratch buffers |
| **`J:\`** | System Tools | NTFS | Diagnostic utilities (`wdconfig.exe`), low-level drivers |
| **`M:\`** | SystemOS Misc | NTFS | Shared OneCore DLLs and system services |
| **`N:\`** | Crash & ETW | NTFS | BlackBox hardware crash logs & ETW telemetry traces |
| **`Q:\`** | NVMe Storage | NTFS | Extended NVMe partitions & sideload package repository |
| **`S:\`** | SystemOS / Hermes | NTFS | Protected SystemOS root, packages, runtime manifests |
| **`T:\`** | Virtual Memory | NTFS | Hardware pagefile & scratch memory swap |
| **`U:\`** | User State | NTFS | Compatibility licenses, font caches, device state |
| **`X:\`** | System Auxiliary | NTFS | System auxiliary packages & staging volume |
| **`Y:\`** | Auxiliary Fast | NTFS | High-speed cache auxiliary system volume |

---

## 🛠️ Verified Live Execution Log & Session Milestone (November 2026)

During this hardware deployment and validation session on the live Scarlett target (`XBXOWNED`, `10.0.26100.9445`), the full bare-metal exploitation chain was executed and verified:

1. **Hypervisor Quarantine Released:**
   - Dispatched `IOCTL_XVM_HOLDING_PARTITION` (`0x00150280`, `in=0`) to `\\.\xvmctrl` $\rightarrow$ returned `SUCCESS`.
   - Quarantined physical RAM unlocked and returned to the system address pool.
2. **NVRAM Registers Direct Armed (`xpal.dll`):**
   - Slot `0x27` $\rightarrow$ `0` (`res=0x0`)
   - Slot `0x39` $\rightarrow$ `0` (`res=0x0`)
   - Slot `0x112` $\rightarrow$ `1` (`res=0x0`, SystemOS Transform Mode)
   - Slot `0xAB` $\rightarrow$ `0xC8` (200) (`res=0x0`, Unrestricted Profiling)
   - Verified via `wdconfig ProfilingMode=true` $\rightarrow$ `SUCCESS`.
3. **Storage Filter Bypassed (`XRO.SYS`):**
   - Issued `FSCTL_XRO_DISPOSITION_OVERRIDE` on `C:\` $\rightarrow$ returned `0x00000000` (`S_OK`).
   - Verified full write capability across previously locked system partitions.
4. **AllDrives Junction Federation:**
   - Created and verified NTFS junction targets under `D:\DevelopmentFiles\AllDrives\` for drives `C:`, `M:`, `S:`, `Q:`, `J:`, `X:`, `Y:`, `G:`, `N:`, and `U:`.
   - Registered DevHome toolwindow overlay via `wdapp.exe overlayfolder`.
5. **Display Pipeline & Shell Stability:**
   - Abandoned unstable desktop shell redirection (`switch_desktop_shell.py` / `explorer.exe`) to prevent HDMI signal dropout.
   - Preserved the native DevHome shell on HDMI while controlling system internals via background daemons and remote endpoints.
6. **AI Studio Linux Controller Integration:**
   - Staged, sanitized (no private network IPs committed), and integrated the full Web UI suite (`ai_studio_webui`) into the repository.
   - Deployed live on `http://0.0.0.0:3000` with active telemetry, process monitoring, and file extraction capabilities.
7. **Purged Inaccurate Artifacts:**
   - Permanently purged obsolete synthetic writeups (`XPAL_MANUFACTURING_MODE_GUARDIROUND_DISCLOSURE_WRITEUP.md`) to maintain strict technical accuracy based exclusively on verified hardware telemetry.

---

## 📁 Repository Structure

```text
├── ai_studio_webui/              # Complete Linux AI Studio Controller (React 19 + Express)
│   ├── server.ts                 # Backend proxy & WDP/SSH command bridge
│   ├── src/                      # UI components: Process Monitor, Peek/Poke, ETW, Drives
│   └── package.json              # Web UI dependencies & build scripts
├── breakthrough_scripts/         # Primary operational & hardware control scripts
│   ├── set_xconfig.py            # NVRAM slot direct configuration via xpal.dll
│   ├── set_mfg_id.py             # Manufacturing ID & flag activator (0x8001 / 0x03)
│   ├── setup_wdp_junctions.py    # AllDrives NTFS junction creator for WDP access
│   ├── patch_devhome_wdp_ui.py   # DevHome toolwindow & WDP HUD overlay injector
│   ├── box_xro_directories.py    # XRO.SYS filter bypass utility
│   ├── local_auth_responder.py   # Captive portal & authentication responder
│   ├── probe_boot_redirection.py # Boot redirection & environment auditor
│   └── unattend.cmd              # Unattended deployment bootstrap
├── local_docs_and_source/        # Low-level source code & hardware research
│   ├── vmm_full_control.py       # Hypervisor holding partition release logic
│   ├── xvm.c / xvmctrl_probe.c   # C probes for \\.\xvmctrl IOCTL interface
│   ├── hermes_bridge.py          # Native kernel bridge daemon (port 1984)
│   ├── hermes_uwp_main.cpp       # Native C++ shell & privilege bridge source
│   ├── ALL_XCONFIG_SETTINGS.txt  # Complete NVRAM slot dictionary dump
│   └── XBOX_ONECORE_SYSTEMS_RESEARCH_WRITEUP.md # OneCore architecture research
├── xbox_devfiles/                # 886-file hard backup of devkit scripts, tools & configs
├── xbox_d_root/                  # 15 root boot-chain files from D:\
├── SESSION_BREAKDOWN_FULL_7992.md# Deep technical exploitation report
├── START_TO_FINISH_GUIDE.md      # Comprehensive step-by-step restoration guide
└── SHA256SUMS.txt                # Cryptographic verification manifest
```

---

## 🔄 Redundant Remote Repositories

This repository is synchronized across three independent remotes:

1. **`origin` (Primary Public Mirror):**
   `https://github.com/tooplayercold-debug/Xbox-Hard-Backup.git`
2. **`redundancy` (Secondary Redundant Mirror):**
   `https://github.com/aaronatchley6123-lab/Xbox-Hard-Backup.git`
3. **`unedited-backup` (Master Backup Archive):**
   `git@github.com:superspeedmodz-rgb/Xbox-Hard-Backup.git`
