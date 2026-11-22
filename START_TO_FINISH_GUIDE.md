# Xbox Series X Devkit — Start-to-Finish Hard Backup & Recovery Guide

**Snapshot Date:** 2026-11-22  
**Target Console:** `XBXOWNED` (`<XBOX_SRA_IP>`, OS `10.0.26100.9445`, Platform: Xbox Series X Devkit)  
**Access:** SSH (`DevToolsUser@<XBOX_SRA_IP>`, port `22`) & Windows Device Portal (`https://<XBOX_SRA_IP>:11443`)

---

## 1. What Is Preserved in This Backup

| Folder | Contents |
| :--- | :--- |
| `xbox_d_root/` | All 15 root files from `D:\` (`setup.xboxunattend`, `boot.cmd`, `unattend.cmd`, `oobe.cmd`, `setup.bat`, `usbscript.bat`, `<REDACTED_CERT>`, `query_xvmctrl*.py`, backups) |
| `xbox_devfiles/` | All scripts (`.py`, `.bat`, `.cmd`, `.sh`, `.c`, `.cpp`), configs (`.json`, `.xml`, `.ini`), certs (`.cer`, `.pfx`), logs (`.log`, `.txt`), `xrofilter.dll`, `xrolock.exe`, `xvm.exe`, plus subdirectories `Certs/`, `exported_certs/`, `xpal/`, `hermes_skills/`, `OneCoreDesktop/`, `DevHomeOverlay/`, `apps/`, `ROOT/` |
| `local_docs_and_source/` | Local documentation & source copies (`setup_xboxunattend_discovery_breakdown.md`, `XBOX_ONECORE_SYSTEMS_RESEARCH_WRITEUP.md`, `xbox_actions_timeline.txt`, `xbox_ssh.py`, `hermes_bridge.py`, `vmm_full_control.py`, `hermes_uwp_main.cpp`, `xvm.c`, `xvmctrl_probe.c`, `setup.xboxunattend`, `arm_*.py`) |
| `SHA256SUMS.txt` | Full SHA-256 manifest of every file in this backup |

*(Large non-script blobs on the Xbox — `D:\DevelopmentFiles\llama` [9.8 GB], `AllDrives` [3.5 GB], `LooseApps` [679 MB], `linux_bin` [124 MB] — were excluded to keep this hard copy compact and fast to archive.)*

---

## 2. Start-to-Finish Execution Chain

### Stage 1 — Connection & Environment
- Console IP: `<XBOX_SRA_IP>` (Ethernet direct to host `<HOST_GATEWAY_IP>`)
- SSH login: `ssh -o PubkeyAuthentication=no DevToolsUser@<XBOX_SRA_IP>`
- Device Portal: `https://<XBOX_SRA_IP>:11443`
- Embedded Python on console: `D:\DevelopmentFiles\LooseApps\pkg\python.exe`

### Stage 2 — Boot-Time Unattended Trigger (`setup.xboxunattend`)
1. `D:\setup.xboxunattend` (also copy to USB root `E:\setup.xboxunattend` for cold-boot auto-scan) contains:
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
2. Boot flags via `Microsoft.Xbox.Development.UnattendedUtilities` (`IUnattendedUtilitiesStatics` IID `de87ad07-75dc-4eec-9226-5628e98b9914`, see `local_docs_and_source/arm_and_reboot_final.py`):
   - `vtable[23]`: `put_ShouldBlockUnattend(0)`
   - `vtable[17]`: `put_ShouldBlockUsb(0)`
   - `vtable[19]`: `put_ShouldSkipAbortToast(1)`
   - `vtable[15]`: `put_ShouldRunOobe(1)`

### Stage 3 — XRO Filter Unlock & `\\.\xvmctrl` VMM Sequence (`vmm_full_control.py`)
1. Loads `J:\tools\xrofilter.dll` (fallback `D:\DevelopmentFiles\xrofilter.dll`), constructs manager (ordinal `1`), and calls unlock (ordinal `16`) on `C:\` (and `M:\` / `J:\` as needed).
2. Opens `\\.\xvmctrl` (`GENERIC_READ | GENERIC_WRITE`) and sends across `VmId 1` (SRA), `0` (HostOS), and `2` (ERA):
   - `0x0015010C` — `IOCTL_XVM_STATE_SIGNAL`
   - `0x00150178` — `IOCTL_XVM_RESOURCE_BOUNDARY`
   - `0x00150280` — `IOCTL_XVM_HOLDING_PARTITION`
3. Releases holding partition latch (`0x00150280`, `in=0`).
4. Verifies drive read/write permissions across `C, D, M, Q, S, T, U, V, X, Y`.

### Stage 4 — Persistent Bridge Daemon (`hermes_bridge.py` on Port `1984`)
- Required by `XBXOwnedNative.exe` (`XBXOwned.XboxDevKitStudio`), which connects to `127.0.0.1:1984`.
- When launching over SSH, **must** be spawned with `CREATE_BREAKAWAY_FROM_JOB` (`0x01000000`) + `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW` so Windows OpenSSH's job object does not kill it on disconnect:
  ```python
  subprocess.Popen(
      [r"D:\DevelopmentFiles\LooseApps\pkg\python.exe", "-u", r"D:\DevelopmentFiles\hermes_bridge.py"],
      cwd=r"D:\DevelopmentFiles",
      stdin=subprocess.DEVNULL,
      stdout=open(r"D:\DevelopmentFiles\bridge_live.log", "ab"),
      stderr=subprocess.STDOUT,
      creationflags=0x00000008 | 0x00000200 | 0x08000000 | 0x01000000,
      close_fds=True,
  )
  ```
- Verify listening after SSH exit: `netstat -ano | findstr 1984` → `TCP 0.0.0.0:1984 ... LISTENING`.

---

## 3. Quick Restore Commands (From Linux Host)

Restore `D:\setup.xboxunattend` (or any root script):
```bash
scp -o PubkeyAuthentication=no xbox_d_root/setup.xboxunattend DevToolsUser@<XBOX_SRA_IP>:D:/setup.xboxunattend
```

Restore `vmm_full_control.py` and `hermes_bridge.py`:
```bash
scp -o PubkeyAuthentication=no \
  xbox_devfiles/vmm_full_control.py \
  xbox_devfiles/hermes_bridge.py \
  DevToolsUser@<XBOX_SRA_IP>:D:/DevelopmentFiles/
```

Verify backup integrity:
```bash
cd /home/<USER>/Xbox_Hard_Backup_20261122 && sha256sum -c SHA256SUMS.txt | grep -v ": OK$"
```
