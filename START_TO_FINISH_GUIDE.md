# Xbox Series X Devkit — Complete Start-to-Finish Exploitation & Recovery Guide

**Snapshot Date:** 2026-11-28  
**Target Console:** `XBXOWNED` (OS `10.0.26100.9445`, Platform: Xbox Series X Devkit)  
**Host Controller:** Linux AI Studio Workstation (`http://0.0.0.0:3000`)  
**Network Connectivity:** Direct Gigabit Ethernet (`<HOST_IP>` $\leftrightarrow$ `<CONSOLE_IP>`)  
**Active Endpoints:** 
- OpenSSH: `<CONSOLE_IP>:22` (`DevToolsUser`)
- Windows Device Portal (WDP): `https://<CONSOLE_IP>:11443`
- SMB3 File Shares: `\\<CONSOLE_IP>\DevelopmentFiles` (port `445`)
- Hermes Internal Bridge: `<CONSOLE_IP>:1984`
- Host AI Studio Web UI: `http://localhost:3000`

---

## 1. Preserved Backup Architecture

| Directory / File | Description & Core Assets |
| :--- | :--- |
| `breakthrough_scripts/` | Complete operational Python/Batch automation: WDP AllDrives junctions, DevHome WDP overlay patch, desktop shell switcher, local auth responder, XRO directory boxing, manufacturing ID / XConfig setters, unattended boot scripts |
| `xbox_d_root/` | All 15 root files from `D:\` (`setup.xboxunattend`, `boot.cmd`, `unattend.cmd`, `oobe.cmd`, `setup.bat`, `usbscript.bat`, certs, `query_xvmctrl*.py`) |
| `xbox_devfiles/` | Complete on-console scripts (`.py`, `.bat`, `.cmd`), configs (`.json`, `.xml`, `.ini`), certs (`.cer`, `.pfx`), `xrofilter.dll`, `xvm.exe`, `Certs/`, `exported_certs/`, `xpal/`, `hermes_skills/`, `OneCoreDesktop/`, `DevHomeOverlay/`, `apps/`, `ROOT/` |
| `local_docs_and_source/` | Reference source code and technical writeups: `setup_xboxunattend_discovery_breakdown.md`, `XBOX_ONECORE_SYSTEMS_RESEARCH_WRITEUP.md`, `hermes_bridge.py`, `vmm_full_control.py`, `hermes_uwp_main.cpp`, `xvm.c`, `xvmctrl_probe.c`, `arm_*.py` |
| `SESSION_BREAKDOWN_FULL_7992.md` | Full technical post-exploitation breakdown: VMM ring IOCTL sequences, XPAL hardware flags, token privileges, root certs, drive permissions, and AppContainer boundary bypass |
| `SHA256SUMS.txt` | Cryptographic SHA-256 integrity manifest for all preserved assets |

---

## 2. Complete Start-to-Finish Execution Chain

```
Stage 1: Hardware & Network Interconnect (:22, :445, :11443, :1984, :3000)
    │
    ▼
Stage 2: Root Certificate Authority & Trusted Publisher (`TheArchitect.cer`)
    │
    ▼
Stage 3: Manufacturing Mode & XPAL XConfig Arming (`set_mfg_id.py`, `set_xconfig.py`)
    │
    ▼
Stage 4: Hypervisor Latch Release & DirectStorage DMA (`\\.\xvmctrl` IOCTLs)
    │
    ▼
Stage 5: Boot-Time Unattended Persistence (`setup.xboxunattend` & `unattend.cmd`)
    │
    ▼
Stage 6: Winlogon Shell Redirection & Desktop Server (`switch_desktop_shell.py`)
    │
    ▼
Stage 7: WDP File Explorer Un-Gating via AllDrives Junctions (`setup_wdp_junctions.py`)
    │
    ▼
Stage 8: On-Device DevHome HUD & Toolwindow Patch (`patch_devhome_wdp_ui.py`)
    │
    ▼
Stage 9: Linux AI Studio Web Controller & Live WDP Process Engine (Port 3000)
    │
    ▼
Stage 10: Verification, Validation & Health Monitoring
```

---

### Stage 1 — Network & Endpoint Connectivity

1. Establish direct wired Ethernet connectivity between Linux host (`<HOST_IP>`) and Xbox Series X Devkit (`<CONSOLE_IP>`).
2. Verify TCP ports are open:
   - Port `22` (OpenSSH): `ssh -o PubkeyAuthentication=no DevToolsUser@<CONSOLE_IP>`
   - Port `11443` (WDP): Authenticate with `DevToolsUser`
   - Port `445` (SMB3): Mount or inspect `\\<CONSOLE_IP>\DevelopmentFiles`
3. Identify embedded runtime: `D:\DevelopmentFiles\LooseApps\pkg\python.exe`.

---

### Stage 2 — Certificate Provisioning & Root Token Escalation

To allow custom native UWP packages (such as `XBXOwned.XboxDevKitStudio`) and elevated binaries to install and run without platform signature rejections:

1. Install root authority certificate `TheArchitect.cer` (`cu_CA_7_Unamed`) into the system stores:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\install_cert.py
   ```
   Installs `TheArchitect.cer` into `Cert:\LocalMachine\Root` and `Cert:\LocalMachine\TrustedPeople`.
2. Add subject "tester" to TrustedPublisher:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\add_trusted_publisher.py
   ```
3. Read-back verification: Confirms certificate chain is active in LocalMachine store.

---

### Stage 3 — Manufacturing Mode & XPAL XConfig Arming

Arms the devkit privilege flags and sets hardware release states:

1. Set Manufacturing ID to `MSIX:8001`:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\set_mfg_id.py
   ```
   - Slot `0x02` $\rightarrow$ `MSIX:8001`
2. Configure XPAL XConfig flags:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\set_xconfig.py
   ```
   - Slot `0xAB` $\rightarrow$ `0x01` (Internal devkit privilege flag)
   - Slot `0x112` $\rightarrow$ `1, 0, 0, 0` (OneCore transform mode)
3. Reset Hardware IO flags:
   - IO `27` (HDMI) $\rightarrow$ `6`
   - IO `39` (Power) $\rightarrow$ `2`
   *(Prerequisite to ensure `xvmctrl` properly releases the holding partition latch without hardware reset halts).*

---

### Stage 4 — Hypervisor & VMM Ring Latch Release (`\\.\xvmctrl`)

Executes the kernel-level hypervisor release and verifies DirectStorage DMA throughput:

1. Execute `vmm_full_control.py`:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\vmm_full_control.py
   ```
2. Unlocks the XRO Filter:
   - Loads `xrofilter.dll`, creates manager (ordinal `1`), and unlocks target drives (ordinal `16`).
3. Dispatches IOCTLs across `VmId 1` (SRA), `0` (HostOS), and `2` (ERA) on `\\.\xvmctrl`:
   - `0x0015010C` — `IOCTL_XVM_STATE_SIGNAL`
   - `0x00150178` — `IOCTL_XVM_RESOURCE_BOUNDARY`
   - `0x00150280` — `IOCTL_XVM_HOLDING_PARTITION` (`in=0` input buffer of all zeros)
4. Result:
   - Holding partition latch is permanently released.
   - Read/write execution authority is unlocked on drives `D:\`, `Q:\`, `S:\`, `T:\`, `U:\`, `V:\`.
   - DirectStorage IoRing engine (`ioring_benchmark.exe`) reaches **572+ MB/s** NVMe throughput.

---

### Stage 5 — Boot-Time Unattended Persistence (`setup.xboxunattend` & `unattend.cmd`)

To achieve true bare-metal dominance that survives cold boots and power cycles without requiring interactive user login or network dependency, the boot chain utilizes the native Xbox setup automation subsystem:

#### 1. Architecture & Execution Mechanism
- **System Service:** The out-of-process system service `XboxDevService.exe` (`M:\windows\system32\XboxDevService.exe`) executes at boot time as `NT AUTHORITY\SYSTEM`.
- **Interface Enumeration:** During initial hardware enumeration, `toolsautoexec.exe` queries `Microsoft.Xbox.Development.UnattendedUtilities` and calls `DevGetObjects(DevObjectTypeDeviceInterface, ..., &cDevObjects, &pDevObjects)` to scan the root directory of all attached internal and external drives (`D:\`, USB mass storage `E:\`) for matching `\*.xboxunattend` files.
- **SYSTEM Process Creation:** When a matching file (`\*.xboxunattend`) is located, `XboxDevService.exe` invokes `DoCreateProcessForUnattendedScript` to execute the file directly as `NT AUTHORITY\SYSTEM` before any user profile or kiosk shell initializes.

#### 2. Deploying the Entry Point (`D:\setup.xboxunattend`)
Deploy `setup.xboxunattend` to the root of `D:\`:
```bat
@echo off
set LOG=D:\DevelopmentFiles\system_success.log
echo ==================================================== > %LOG%
echo [!] UNATTENDED COLD-BOOT EXECUTION INITIATED >> %LOG%
echo [%date% %time%] Running as NT AUTHORITY\SYSTEM >> %LOG%

:: 1. Install Root Certificate Authority & Trusted Publisher
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\install_cert.py" >> %LOG% 2>&1
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\add_trusted_publisher.py" >> %LOG% 2>&1

:: 2. Release Hypervisor Holding Partition Latch (IOCTL 0x00150280 in=0)
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\vmm_full_control.py" >> %LOG% 2>&1

:: 3. Box Protected Directories Against Storage Wiper via XRO
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\box_xro_directories.py" >> %LOG% 2>&1

:: 4. Launch Hermes Kernel Bridge Daemon (Port 1984) with Breakaway Flags
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py"

:: 5. Chain to Secondary Orchestration Script
if exist "D:\DevelopmentFiles\unattend.cmd" (
    call "D:\DevelopmentFiles\unattend.cmd" >> %LOG% 2>&1
)

echo [!] UNATTENDED COLD-BOOT EXECUTION COMPLETED >> %LOG%
```

#### 3. Secondary Boot Orchestrator (`D:\DevelopmentFiles\unattend.cmd`)
Deploy `breakthrough_scripts/unattend.cmd` to `D:\DevelopmentFiles\unattend.cmd`:
```cmd
@echo off
echo [%date% %time%] Clean Master Boot Sequence Initiated >> D:\DevelopmentFiles\unattend_boot_log.txt
set PATH=C:\Windows\System32;D:\DevelopmentFiles\LooseApps\pkg;%PATH%

:: 1. Box directories against wiper via XRO
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\box_xro_directories.py" >> D:\DevelopmentFiles\xro_boot.log 2>&1

:: 2. Launch Local DNS & Captive Auth Responder (Port 53 & 80)
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\local_auth_responder.py" >> D:\DevelopmentFiles\auth_boot.log 2>&1

:: 3. Persistent Loopback Exemption
C:\Windows\System32\CheckNetIsolation.exe LoopbackExempt -a -n=HermesOS.SeriesX_czgs116rtv2ap >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

:: 4. Register Scratch Package
"J:\tools\wdapp.exe" registerscratch "LooseApps\pkg" >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

:: 5. Overlay DevHome with Custom Toolwindows
"J:\tools\wdapp.exe" overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\DevelopmentFiles\DevHomeOverlay >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

echo [%date% %time%] Master Boot Sequence Complete >> D:\DevelopmentFiles\unattend_boot_log.txt
```

#### 4. Arming the WinRT Unattended Trigger (`arm_oobe.py`)
To ensure `XboxDevService.exe` actively executes `*.xboxunattend` on boot, arm the NVRAM and WinRT flags using `combase.dll`:
```python
# Save as D:\DevelopmentFiles\arm_oobe.py and run via python.exe
import ctypes

combase = ctypes.WinDLL('combase.dll')
combase.RoInitialize(1)

class HSTRING(ctypes.c_void_p): pass
hs = HSTRING()
class_name = "Microsoft.Xbox.Development.UnattendedUtilities"
combase.WindowsCreateString(class_name, len(class_name), ctypes.byref(hs))

class GUID(ctypes.Structure):
    _fields_ = [
        ('Data1', ctypes.c_ulong),
        ('Data2', ctypes.c_ushort),
        ('Data3', ctypes.c_ushort),
        ('Data4', ctypes.c_ubyte * 8)
    ]

# IID_IUnattendedUtilitiesStatics
iid_statics = GUID(0xde87ad07, 0x75dc, 0x4eec, (ctypes.c_ubyte * 8)(0x92, 0x26, 0x56, 0x28, 0xe9, 0x8b, 0x99, 0x14))

pStatics = ctypes.c_void_p()
hr = combase.RoGetActivationFactory(hs, ctypes.byref(iid_statics), ctypes.byref(pStatics))
if hr != 0:
    raise RuntimeError(f"RoGetActivationFactory failed: {hex(hr & 0xFFFFFFFF)}")

vtable = ctypes.cast(pStatics, ctypes.POINTER(ctypes.c_void_p)).contents.value
FN_PUT_BOOL = ctypes.WINFUNCTYPE(ctypes.c_long, ctypes.c_void_p, ctypes.c_ubyte)

# Method slot 15: put_ShouldRunOobe / put_ShouldRunOobeScript
fn_oobe = FN_PUT_BOOL(ctypes.cast(vtable + 15 * 8, ctypes.POINTER(ctypes.c_void_p)).contents.value)
hr_oobe = fn_oobe(pStatics, 1)

# Method slot 17: put_ShouldBlockUsb
fn_usb = FN_PUT_BOOL(ctypes.cast(vtable + 17 * 8, ctypes.POINTER(ctypes.c_void_p)).contents.value)
hr_usb = fn_usb(pStatics, 0)

# Method slot 23: put_ShouldBlockUnattend
fn_unattend = FN_PUT_BOOL(ctypes.cast(vtable + 23 * 8, ctypes.POINTER(ctypes.c_void_p)).contents.value)
hr_unattend = fn_unattend(pStatics, 0)

print(f"[+] ShouldRunOobeScript(1) : {hex(hr_oobe & 0xFFFFFFFF)}")
print(f"[+] ShouldBlockUsb(0)      : {hex(hr_usb & 0xFFFFFFFF)}")
print(f"[+] ShouldBlockUnattend(0) : {hex(hr_unattend & 0xFFFFFFFF)}")
```
*Execute on the console:*
```cmd
D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\arm_oobe.py
```

#### 5. External USB Rescue Auto-Execution (`E:\setup.xboxunattend`)
Format any standard USB flash drive as **FAT32** and copy `setup.xboxunattend` directly to the root (`E:\setup.xboxunattend`).
- Because `put_ShouldBlockUsb(0)` is armed, inserting this USB drive into any console USB port causes `XboxDevService.exe` to automatically detect and run the rescue payload on cold boot, even if internal drives (`D:\`) have been completely formatted or cleared.

#### 6. Boot Verification & Telemetry
After a reboot, verify that the cold-boot sequence executed with full `SYSTEM` authority by reading the generated telemetry logs:
```cmd
type D:\DevelopmentFiles\system_success.log
type D:\DevelopmentFiles\unattend_boot_log.txt
```
*Expected Status Output:*
```text
====================================================
[!] UNATTENDED COLD-BOOT EXECUTION INITIATED
[Sat 11/28/2026 06:15:22.18] Running as NT AUTHORITY\SYSTEM
[+] Root Certificate Installed Successfully.
[+] Trusted Publisher Stored.
[+] IOCTL_XVM_HOLDING_PARTITION Release (in=0) -> SUCCESS
[+] XRO Directory Boxing Active.
[+] Hermes Bridge Daemon Active on TCP 0.0.0.0:1984
[!] UNATTENDED COLD-BOOT EXECUTION COMPLETED
```

---

### Stage 6 — Native Shell Preservation & DevHome Toolwindow Overlay

Earlier attempts to redirect the Winlogon shell to standard desktop components (`switch_desktop_shell.py` / `explorer.exe`) resulted in complete video signal loss over HDMI because Windows OneCore on AMD Scarlett lacks traditional DWM desktop compositing pipelines.

To maintain 100% video output stability on HDMI while unlocking full devkit capabilities:

1. **Preserve Native DevHome:** The console boots directly into the native `Microsoft.Xbox.DevHome` application on HDMI.
2. **Inject Toolwindow Overlays:** Register the custom developer toolwindow overlay folder via `wdapp.exe`:
   ```cmd
   J:\tools\wdapp.exe overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\DevelopmentFiles\DevHomeOverlay
   ```
3. **Patch WDP HUD & Toolwindows (`patch_devhome_wdp_ui.py`):**
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\patch_devhome_wdp_ui.py
   ```
   - Injects the live telemetry HUD pointing to the Linux AI Studio controller (`http://<HOST_IP>:3000`).
   - Surfaces un-gated drive shortcuts and process monitors directly within the DevHome UI.
4. **Result:** Full bare-metal control, kernel daemon bridges, and live telemetry without breaking the HDMI display hardware.

---

### Stage 7 — WDP File Explorer Un-Gating (AllDrives NTFS Junctions)

By default, Windows Device Portal's File Explorer (`/api/filesystem/apps/files`) is strictly gated to `D:\DevelopmentFiles` and developer folders. We un-gate every partition on the system:

1. Run `setup_wdp_junctions.py` on the console:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\setup_wdp_junctions.py
   ```
2. Creates NTFS reparse points / directory junctions inside `D:\DevelopmentFiles\AllDrives\`:
   - `Drive_C` $\rightarrow$ `C:\` (System Partition)
   - `Drive_M` $\rightarrow$ `M:\` (Manufacturing / Configuration Partition)
   - `Drive_S` $\rightarrow$ `S:\` (System Scratch / Title State)
   - `Drive_Q` $\rightarrow$ `Q:\` (Development Temporary Storage)
   - `Drive_J` $\rightarrow$ `J:\` (OS Image / Tool Packages)
   - `Drive_X` $\rightarrow$ `X:\` (System Recovery Partition)
   - `Drive_Y` $\rightarrow$ `Y:\` (Hardware Diagnostic Partition)
   - `Drive_E` $\rightarrow$ `E:\` (External USB Storage)
   - `Drive_G` $\rightarrow$ `G:\` (Game Title Installation Drive)
   - `Drive_N` $\rightarrow$ `N:\` (Network Cache Partition)
   - `Drive_U` $\rightarrow$ `U:\` (User Data Partition)
3. Result: Browsing `https://<CONSOLE_IP>:11443/` in WDP File Explorer now gives instantaneous, unrestricted read and download access to all 11 partitions over HTTPS.

---

### Stage 8 — On-Device DevHome HUD & Toolwindow Patch

Directly maps the Linux controller into the HDMI TV screen overlay:

1. Run `patch_devhome_wdp_ui.py`:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\patch_devhome_wdp_ui.py
   ```
2. Patches `D:\DevelopmentFiles\DevHomeOverlay\toolwindows\wdp\wdp.html`.
3. Injects the **AI Studio Linux Controller (Port 3000)** card:
   - Status: `PORT 3000 ACTIVE`
   - Endpoint: `http://<HOST_IP>:3000`
   - Links the `AllDrives` directory root directly in the on-screen DevHome tool window.

---

### Stage 9 — Linux AI Studio Web Controller (Port 3000)

Run the unified AI Studio Controller on the Linux host:

1. Start the server:
   ```bash
   cd /home/nitrokali/Downloads/final10 && npm run dev
   ```
2. Access the controller dashboard at `http://localhost:3000`.
3. Integrated capabilities:
   - **Task Manager & Process Control**:
     - `POST /api/xbox/processes`: Live polling of `/api/resourcemanager/processes` and `/api/os/info`.
     - `POST /api/xbox/processes/kill`: Instant termination via authenticated WDP CSRF `DELETE /api/resourcemanager/processes?pid={pid}`.
     - `POST /api/xbox/processes/dump`: Live minidump generation into `D:\DevelopmentFiles\Dumps`.
   - **App Manager**: Live deployment, launch, and package inspection (`POST /api/xbox/apps/launch`, `/api/xbox/apps/kill`, `/api/xbox/apps/deploy`).
   - **File Explorer**: Seamless tree navigation across all partitions through `/api/xbox/fs/tree` and the AllDrives junction tree.
   - **Hardware Diagnostics**: Real-time probe of ports `22`, `445`, `11443`, `1984` and live system screenshots via `/ext/screenshot`.

---

### Stage 10 — Verification & Recovery Runbook

#### Health Check
```bash
# 1. Verify WDP responsiveness (<5ms)
curl -k -u "DevToolsUser:<PASSWORD>" https://<CONSOLE_IP>:11443/api/os/info

# 2. Check running processes via AI Studio API
curl -s -X POST http://localhost:3000/api/xbox/processes | jq '{ok, count, telemetry}'

# 3. Verify AllDrives junctions via WDP File API
curl -k -u "DevToolsUser:<PASSWORD>" \
  "https://<CONSOLE_IP>:11443/api/filesystem/apps/files?knownfolderid=DevelopmentFiles&path=%5CAllDrives" | jq .
```

#### One-Command Script Synchronization
```bash
# Push latest breakthrough scripts to Xbox
scp -o PubkeyAuthentication=no \
  breakthrough_scripts/* \
  DevToolsUser@<CONSOLE_IP>:D:/DevelopmentFiles/
```

#### Emergency Reboot & Arming
```bash
# Trigger soft reboot via WDP
curl -k -X POST -u "DevToolsUser:<PASSWORD>" https://<CONSOLE_IP>:11443/api/control/restart
```
*(On reboot, `setup.xboxunattend` automatically re-executes certificate installs, VMM latch release, and re-spawns the Hermes Bridge on port 1984).*
