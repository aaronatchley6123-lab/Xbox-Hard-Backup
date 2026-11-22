import winreg, os

# 1. Inspect Features on Demand
print("=== Features on Demand ===")
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\Features on Demand") as k:
        subkeys, vals, _ = winreg.QueryInfoKey(k)
        print(f"Subkeys: {subkeys}, Values: {vals}")
        for i in range(subkeys):
            print("  Subkey:", winreg.EnumKey(k, i))
        for i in range(vals):
            print("  Value:", winreg.EnumValue(k, i))
except Exception as e:
    print("Err Features on Demand:", e)

# 2. Check PackageIndex or packages with 'Desktop' or 'Shell' or 'Feature'
print("\n=== CBS Package Names (Filtered) ===")
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\Packages") as k:
        subkeys, _, _ = winreg.QueryInfoKey(k)
        found = []
        for i in range(subkeys):
            sk = winreg.EnumKey(k, i)
            skl = sk.lower()
            if any(x in skl for x in ['shell', 'desktop', 'explorer', 'feature', 'onedrive', 'notepad', 'calc']):
                found.append(sk)
        print(f"Found {len(found)} matching packages:")
        for name in sorted(found)[:30]:
            print(" ", name)
except Exception as e:
    print("Err Packages:", e)

# 3. Check for any servicing DLLs in System32
print("\n=== System32 Servicing DLLs ===")
for f in os.listdir(r"C:\Windows\System32"):
    if any(k in f.lower() for k in ['servicing', 'dism', 'cbs', 'wcp', 'update']):
        print(" ", f)

