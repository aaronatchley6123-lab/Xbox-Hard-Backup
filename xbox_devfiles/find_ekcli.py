import os, sys

print("Searching for EKCli / ekcli...")
targets = [r'J:\tools', r'C:\Windows\System32', r'D:\DevelopmentFiles', r'C:\Windows']
for t in targets:
    if os.path.exists(t):
        for root, dirs, files in os.walk(t):
            for f in files:
                if 'ekcli' in f.lower():
                    print("Found file:", os.path.join(root, f))
                elif 'ek' in f.lower() and 'cli' in f.lower():
                    print("Candidate:", os.path.join(root, f))

# Also search registry
import winreg
for hive_name, hive in [("HKLM", winreg.HKEY_LOCAL_MACHINE), ("HKCU", winreg.HKEY_CURRENT_USER)]:
    for sub in [r"SOFTWARE\Microsoft", r"SYSTEM\CurrentControlSet\Services"]:
        try:
            with winreg.OpenKey(hive, sub) as k:
                # search subkeys
                i = 0
                while True:
                    try:
                        sk = winreg.EnumKey(k, i)
                        if 'ekcli' in sk.lower() or 'ek' in sk.lower():
                            print(f"Reg subkey ({hive_name}): {sub}\\{sk}")
                        i += 1
                    except OSError:
                        break
        except Exception:
            pass
print("Done search.")
