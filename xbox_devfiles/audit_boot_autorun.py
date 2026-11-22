import winreg
import os

print("[*] Checking why unattend didn't auto-trigger...")

# Check wdconfig RunUnattend
import subprocess
res = subprocess.run(["J:\\tools\\wdconfig.exe", "export"], capture_output=True, text=True)
for l in res.stdout.splitlines():
    if "unattend" in l.lower() or "auto" in l.lower():
        print("  wdconfig:", l)

# Check Windows Run / RunOnce keys
runs = [
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
    r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
]

for r in runs:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r) as k:
            num_subkeys, num_vals, _ = winreg.QueryInfoKey(k)
            print(f"[+] HKLM {r} ({num_vals} values):")
            for i in range(num_vals):
                name, val, _ = winreg.EnumValue(k, i)
                print(f"    {name} = {val}")
    except Exception as e:
        print(f"[-] {r}: {e}")

