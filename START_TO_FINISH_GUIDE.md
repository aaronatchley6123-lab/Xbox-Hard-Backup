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

Ensures the exploitation state and bridge daemons survive reboots:

1. Deploy `setup.xboxunattend` to `D:\` (and copy to root of any connected USB drive `E:\` for cold-boot auto-scan):
   ```bat
   @echo off
   set LOG=D:\DevelopmentFiles\system_success.log
   echo ==================================================== > %LOG%
   echo [!] UNATTENDED EXECUTION: XRO + ARCHITECT + VMMCALL >> %LOG%
   "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\install_cert.py" >> %LOG% 2>&1
   "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\add_trusted_publisher.py" >> %LOG% 2>&1
   "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\vmm_full_control.py" >> %LOG% 2>&1
   "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\client_control_cli.py" status >> %LOG% 2>&1
   start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py"
   echo [!] UNATTENDED EXECUTION COMPLETED >> %LOG%
   ```
2. Configure unattended boot statics via `IUnattendedUtilitiesStatics` (`de87ad07-75dc-4eec-9226-5628e98b9914`):
   - `put_ShouldBlockUnattend(0)`
   - `put_ShouldBlockUsb(0)`
   - `put_ShouldSkipAbortToast(1)`
   - `put_ShouldRunOobe(1)`
3. Start the background Hermes Bridge (`hermes_bridge.py`) listening on `TCP 0.0.0.0:1984` with breakaway creation flags (`0x01000208`).

---

### Stage 6 — Desktop Shell Transformation & Winlogon Hook

Transforms the console from a locked fullscreen kiosk into an interactive OneCore desktop environment:

1. Execute `switch_desktop_shell.py`:
   ```cmd
   D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\switch_desktop_shell.py
   ```
2. Applies registry hooks to `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon`:
   - `UserMgrLaunchShell` $\rightarrow$ `1` (DWORD)
   - `Shell` $\rightarrow$ `cmd.exe /c "start /b python D:\DevelopmentFiles\desktop_server.py"`
3. Starts `desktop_server.py`:
   - Acquires `SeBackupPrivilege` and elevated access rights.
   - Spawns dynamic all-drives bar and local web administration shell.

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
