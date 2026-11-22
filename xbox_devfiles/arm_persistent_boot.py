import os
import sys
import winreg

print("[*] Arming streamlined single-trigger persistence & VMM pipeline...", flush=True)

BASE_DIR = r"D:\DevelopmentFiles"
PYTHON_EXE = os.path.join(BASE_DIR, r"LooseApps\pkg\python.exe")
WDAPP_EXE = r"J:\tools\wdapp.exe"
AUMID = "HermesOS.SeriesX_czgs116rtv2ap!App"

# ---------------------------------------------------------------------------
# 1. Single Master Boot Script: D:\unattend.cmd (toolsautoexec.exe engine)
# ---------------------------------------------------------------------------
unattend_script = f"""@echo off
echo [%date% %time%] Clean Master Boot Sequence Initiated >> {BASE_DIR}\\unattend_boot_log.txt
set PATH=C:\\Windows\\System32;{BASE_DIR}\\LooseApps\\pkg;D:\\Win11\\System32;%PATH%

:: 1. Loopback Exemption (Persistent)
C:\\Windows\\System32\\CheckNetIsolation.exe LoopbackExempt -a -n=HermesOS.SeriesX_czgs116rtv2ap >> {BASE_DIR}\\unattend_boot_log.txt 2>&1

:: 2. Launch Background Hermes Bridge (Single Instance - Port 9999)
start /b "" "{PYTHON_EXE}" "{BASE_DIR}\\hermes_bridge.py" >> {BASE_DIR}\\bridge_live.log 2>&1
if exist "{BASE_DIR}\\desktop_server.py" (
    start /b "" "{PYTHON_EXE}" "{BASE_DIR}\\desktop_server.py" >> {BASE_DIR}\\desktop_server.log 2>&1
)

:: 3. Register Scratch Package Once
"{WDAPP_EXE}" registerscratch "LooseApps\\pkg" >> {BASE_DIR}\\unattend_boot_log.txt 2>&1

:: 4. Compositor Settle & Single Launch (No Busy Loop)
timeout /t 3 /nobreak >nul
"{WDAPP_EXE}" launch "{AUMID}" >> {BASE_DIR}\\unattend_boot_log.txt 2>&1

echo [%date% %time%] Master Boot Sequence Complete >> {BASE_DIR}\\unattend_boot_log.txt
"""

# Write primary D:\unattend.cmd
try:
    with open(r"D:\unattend.cmd", "w", encoding="utf-8") as f:
        f.write(unattend_script)
    print(f"[+] Written master unattend script: D:\\unattend.cmd", flush=True)
except Exception as e:
    print(f"[-] Error writing D:\\unattend.cmd: {e}", flush=True)

# Remove duplicate D:\unattend.bat if present
if os.path.exists(r"D:\unattend.bat"):
    try:
        os.remove(r"D:\unattend.bat")
        print("[+] Removed duplicate D:\\unattend.bat", flush=True)
    except Exception as e:
        print(f"[-] Could not remove D:\\unattend.bat: {e}", flush=True)

# ---------------------------------------------------------------------------
# 2. Clean Q: User Startup Folder (Purge all redundant batches)
# ---------------------------------------------------------------------------
startup_dir = r"Q:\Users\DevToolsUser\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
try:
    if os.path.exists(startup_dir):
        for stale in ["launch_hermes.bat", "launch_hermes_startup.bat", "dashboard_loader.bat", "launch_explorer.bat"]:
            sp = os.path.join(startup_dir, stale)
            if os.path.exists(sp):
                try:
                    os.remove(sp)
                    print(f"[+] Purged redundant startup script: {stale}", flush=True)
                except Exception as ex:
                    print(f"[-] Note removing {stale}: {ex}", flush=True)
except Exception as e:
    print(f"[-] Startup folder cleanup note: {e}", flush=True)

# ---------------------------------------------------------------------------
# 3. Clean HKCU Run Keys (Prevent redundant user-login spawns)
# ---------------------------------------------------------------------------
try:
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_ALL_ACCESS) as k_run:
        for stale in ["HermesBridge", "VMMClient", "Win11NativeDesktop", "ExplorerShell"]:
            try:
                winreg.DeleteValue(k_run, stale)
                print(f"[+] Removed redundant HKCU Run entry: {stale}", flush=True)
            except FileNotFoundError:
                pass
            except Exception as ex:
                print(f"[-] Note removing Run entry {stale}: {ex}", flush=True)
except Exception as e:
    print(f"[-] HKCU Run registry note: {e}", flush=True)

# ---------------------------------------------------------------------------
# 4. Configure HKCU Winlogon Keys (Allow Classic Windows Desktop Policies)
# ---------------------------------------------------------------------------
try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon") as k_winlogon:
        winreg.SetValueEx(k_winlogon, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        winreg.SetValueEx(k_winlogon, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
    print("[+] HKCU Winlogon shell configuration verified.", flush=True)
except Exception as e:
    print(f"[-] HKCU Winlogon registry error: {e}", flush=True)

print("[+] Clean single-trigger boot staging complete!", flush=True)
