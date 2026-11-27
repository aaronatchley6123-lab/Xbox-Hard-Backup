# Xbox Series X Devkit — Master Hard Backup & Restoration Suite

Comprehensive hard backup, exploitation recovery framework, and native Windows 11 desktop environment for the **Xbox Series X Devkit** (`XBXOWNED`, AMD Scarlett Custom APU, OneCore 24H2 Build `10.0.26100.9445`).

---

## 🚀 Quick Setup & Execution

### 1. Prerequisites & Connection
- **Direct Ethernet Link:** Connect the workstation (`<HOST_IP>`) to the Xbox Devkit (`<CONSOLE_IP>`).
- **SSH Access:**
  ```bash
  ssh DevToolsUser@<CONSOLE_IP>
  ```
- **Windows Device Portal (WDP):**
  `https://<CONSOLE_IP>:11443`
- **Embedded Python Runtime:**
  Located on the console at:
  ```cmd
  D:\DevelopmentFiles\LooseApps\pkg\python.exe
  ```

---

### 2. Launching Core Services

#### A. Native Hermes Hypervisor Bridge (Port 1984)
Releases memory from the Hypervisor quarantine (`\.\xvmctrl` IOCTL `0x00150280` `in=0`) and exposes native kernel/subsystem interfaces to userspace:
```cmd
D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\hermes_bridge.py
```
*Verify Listener:*
```cmd
netstat -ano | findstr 1984
```

#### B. Windows 11 Native Desktop UI Engine (Port 8080)
Launches the full graphical desktop environment, terminal, system diagnostics, and multi-drive File Explorer with active `SeBackupPrivilege`:
```cmd
D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\desktop_server.py
```
*Verify Listener:*
```cmd
netstat -ano | findstr 8080
```

---

### 3. Winlogon Shell Redirection (Full Desktop Environment)

To replace the locked MinWin kiosk shell with the full Windows 11 OneCore desktop on boot:
```cmd
D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\switch_desktop_shell.py
```
*Configured Registry Values:*
- `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon\UserMgrLaunchShell` = `1`
- `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon\Shell` = `cmd.exe /c start /b D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\desktop_server.py`
- `HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System\DisableClassicDesktop` = `0`

---

### 4. Manufacturing Mode & Diagnostics Latch

To latch the console into Manufacturing Mode (`0x8001` / `MSIX:8001`) and enable test tools:
```cmd
J:\tools\wdconfig.exe set SandboxId=MSIX:8001
D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\set_mfg_id.py
```
*Reboot into Manufacturing Mode:*
```cmd
D:\DevelopmentFiles\LooseApps\pkg\python.exe -c "import ctypes; ctypes.cdll.LoadLibrary('C:\\Windows\\System32\\xpal.dll').XpalInitiateSystemShutdown(1)"
```

---

## 💽 Logical Drive Architecture

With `SeBackupPrivilege` and `SeRestorePrivilege` acquired in `desktop_server.py`, all 13 logical drives are unlocked and browseable:

| Drive | Label / Volume Role | Filesystem | Contents / Purpose |
| :---: | :--- | :---: | :--- |
| **`C:\`** | System Boot | NTFS | Kernel root, `Program Files`, Windows catalogs |
| **`D:\`** | Development | NTFS | `DevelopmentFiles`, developer toolchain, scripts |
| **`E:\`** | USB Flash Drive | FAT32 | External USB installation media & hard backup |
| **`G:\`** | GameDVR Buffer | NTFS | Audio/Video scratch buffers |
| **`J:\`** | Sys Tools | NTFS | Diagnostic & management tools (`wdconfig.exe`, drivers) |
| **`M:\`** | SystemOS Misc | NTFS | Core SystemOS binaries & system libraries |
| **`N:\`** | Crash / ETW | NTFS | BlackBox crash dumps & ETW telemetry |
| **`Q:\`** | NVMe Storage | NTFS | Extended NVMe partitions & sideload models |
| **`S:\`** | SysOS & HermesGuard | NTFS | Protected SystemOS volume, apps, deployment data |
| **`T:\`** | Scratch & Pagefile | NTFS | Virtual memory pagefile & screenshot captures |
| **`U:\`** | User State | NTFS | BackCompat licenses, font cache, shell state |
| **`X:\`** | SystemAux | NTFS | Auxiliary system partition & apps |
| **`Y:\`** | SystemAuxF | NTFS | Fast auxiliary system partition |

---

## 📁 Repository Directory Structure

```text
├── breakthrough_scripts/         # Primary operational & recovery scripts
│   ├── desktop_server.py         # Windows 11 Desktop Web Engine (13 drives, SeBackupPriv)
│   ├── switch_desktop_shell.py   # Winlogon shell switcher
│   ├── set_mfg_id.py             # Manufacturing ID & flag activator (0x8001 / 0x03)
│   ├── set_xconfig.py            # NVRAM slot direct configuration
│   ├── local_auth_responder.py   # Captive portal & DNS auth responder
│   ├── probe_boot_redirection.py # Boot redirection & environment audit
│   ├── box_xro_directories.py    # XRO filter bypass utility
│   └── unattend.cmd              # Unattended bootstrap installer
├── docs/                         # In-depth architectural writeups
│   └── XPAL_MANUFACTURING_MODE_GUARDIROUND_DISCLOSURE_WRITEUP.md
├── local_docs_and_source/        # Native source code & low-level probes
│   ├── hermes_uwp_main.cpp       # Native C++ desktop shell source
│   ├── hermes_bridge.py          # Native hypervisor bridge daemon
│   ├── vmm_full_control.py       # Memory holding partition release logic
│   ├── xvm.c / xvmctrl_probe.c   # Hypervisor IOCTL communication probes
│   └── ALL_XCONFIG_SETTINGS.txt  # NVRAM slot dictionary dump
├── xbox_devfiles/                # 886-file hard backup of devkit scripts & tools
├── START_TO_FINISH_GUIDE.md      # Step-by-step restoration guide
└── SHA256SUMS.txt                # Full cryptographic checksum manifest
```

---

## 🔄 Multi-Remote Redundancy Architecture

This codebase is mirrored across three distinct repositories for high availability:

1. **Primary Remote (`origin`):**
   `https://github.com/tooplayercold-debug/Xbox-Hard-Backup.git`
2. **Redundant Remote (`redundancy` — Private):**
   `https://github.com/aaronatchley6123-lab/Xbox-Hard-Backup.git`
3. **Unedited Master Archive (`unedited-backup` — Private):**
   `git@github.com:superspeedmodz-rgb/Xbox-Hard-Backup.git`
