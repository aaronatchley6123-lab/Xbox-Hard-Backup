import os, sys

print("[+] Searching for DISM / Servicing components...")
for root_dir in [r'C:\Windows\Servicing', r'C:\Windows\System32', r'C:\Windows\WinSxS', r'C:\Windows']:
    if os.path.exists(root_dir):
        print(f"Checking {root_dir}...")
        try:
            for root, dirs, files in os.walk(root_dir):
                for f in files:
                    fl = f.lower()
                    if any(k in fl for k in ['dism', 'pkgmgr', 'cbs', 'wcp', 'servicing', 'tiworker', 'trustedinstaller', 'dismapi']):
                        print("  Found:", os.path.join(root, f))
        except Exception as e:
            print(f"  Error walking {root_dir}: {e}")

# Check registry for Dism or Servicing packages / features
import winreg
reg_paths = [
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\Packages",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\Features",
]
for p in reg_paths:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, p) as k:
            subkeys, vals, _ = winreg.QueryInfoKey(k)
            print(f"[+] HKLM\\{p}: {subkeys} subkeys, {vals} values")
            for i in range(min(15, subkeys)):
                print(f"    Subkey: {winreg.EnumKey(k, i)}")
    except Exception as e:
        print(f"[-] HKLM\\{p}: {e}")

