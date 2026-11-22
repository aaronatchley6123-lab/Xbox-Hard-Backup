import winreg
import os
import subprocess

print("====================================================")
print("[*] Probing Windows Desktop Environment Enablement Flags...")
print("====================================================")

# Search Windows Desktop / Shell / GDI unlock keys
keys = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"),
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Windows"),
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\ProductOptions"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
]

for root, p in keys:
    try:
        with winreg.OpenKey(root, p) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            print(f"[+] Key {p} ({n_val} values):")
            for i in range(n_val):
                name, val, typ = winreg.EnumValue(k, i)
                if any(q in name.lower() for q in ["product", "edition", "shell", "mode", "desktop", "gui", "type", "console"]):
                    print(f"    {name} = {val}")
    except Exception as e:
        print(f"[-] {p}: {e}")

