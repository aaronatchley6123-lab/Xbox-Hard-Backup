import os
import shutil

src_dir = r"D:\DevelopmentFiles\LooseApps\pkg"
win11_dir = r"D:\Win11\System32"
guard_dir = r"S:\HermesGuard"

os.makedirs(guard_dir, exist_ok=True)

files = [
    (os.path.join(src_dir, "HermesUWPApp.exe"), os.path.join(guard_dir, "HermesUWPApp.exe")),
    (os.path.join(win11_dir, "DesktopLauncher.exe"), os.path.join(guard_dir, "DesktopLauncher.exe")),
    (os.path.join(win11_dir, "shell32.dll"), os.path.join(guard_dir, "shell32.dll")),
    (os.path.join(win11_dir, "psapi.dll"), os.path.join(guard_dir, "psapi.dll")),
    (r"D:\unattend.cmd", os.path.join(guard_dir, "unattend.cmd")),
]

for src, dst in files:
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"[+] Mirrored: {os.path.basename(src)} -> {dst}")
    else:
        print(f"[-] Missing: {src}")

restore_bat = """@echo off
echo [%date% %time%] Hermes Guard Self-Restoration Triggered >> S:\\HermesGuard\\guard.log
if not exist "D:\\DevelopmentFiles" mkdir "D:\\DevelopmentFiles"
if not exist "D:\\DevelopmentFiles\\LooseApps\\pkg" mkdir "D:\\DevelopmentFiles\\LooseApps\\pkg"
if not exist "D:\\Win11\\System32" mkdir "D:\\Win11\\System32"

copy /y S:\\HermesGuard\\HermesUWPApp.exe D:\\DevelopmentFiles\\LooseApps\\pkg\\HermesUWPApp.exe >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\DesktopLauncher.exe D:\\Win11\\System32\\explorer.exe >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\DesktopLauncher.exe D:\\Win11\\System32\\DesktopLauncher.exe >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\shell32.dll D:\\Win11\\System32\\shell32.dll >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\psapi.dll D:\\Win11\\System32\\psapi.dll >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\unattend.cmd D:\\unattend.cmd >> S:\\HermesGuard\\guard.log
copy /y S:\\HermesGuard\\unattend.cmd D:\\unattend.bat >> S:\\HermesGuard\\guard.log

echo [%date% %time%] Hermes Guard Self-Restoration Completed >> S:\\HermesGuard\\guard.log
"""

with open(os.path.join(guard_dir, "self_restore.bat"), "w", encoding="utf-8") as f:
    f.write(restore_bat)

print("[+] Written S:\\HermesGuard\\self_restore.bat")
