import winreg
import os
import subprocess

print("====================================================")
print("[*] Probing How Retail Activates Dev Mode...")
print("====================================================")

# Search WindowsApps on C:\, D:\, or M:\ for DevMode Activation App
# On retail, user runs "Xbox Dev Mode" activation app
app_paths = [r"C:\Program Files\WindowsApps", r"D:\DevelopmentFiles\WindowsApps", r"M:\windows\SystemApps"]
dev_activators = []

for ap in app_paths:
    if os.path.exists(ap):
        try:
            for item in os.listdir(ap):
                if any(k in item.lower() for k in ["devmode", "activation", "devkit", "developer", "retailinfo"]):
                    dev_activators.append(os.path.join(ap, item))
        except Exception as e:
            print(f"[-] {ap}: {e}")

print(f"[+] Found {len(dev_activators)} activator packages/folders:")
for d in dev_activators:
    print(f"    {d}")

# Check registry for DevMode activation keys
keys_to_check = [
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\Unlock",
    r"SOFTWARE\Microsoft\XboxLive",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\DeviceAccess",
    r"SYSTEM\CurrentControlSet\Control\Xbox"
]

for kpath in keys_to_check:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, kpath) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            print(f"[+] Registry Key {kpath} found ({n_val} values):")
            for i in range(n_val):
                name, val, _ = winreg.EnumValue(k, i)
                print(f"    {name} = {val}")
    except Exception:
        pass

