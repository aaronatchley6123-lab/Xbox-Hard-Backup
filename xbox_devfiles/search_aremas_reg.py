import winreg

def search_key(hive, hive_name, path):
    try:
        with winreg.OpenKey(hive, path) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            for i in range(n_val):
                try:
                    vn, vv, _ = winreg.EnumValue(k, i)
                    if 'aremas' in str(vn).lower() or 'aremas' in str(vv).lower():
                        print(f"[+] Reg Value: {hive_name}\\{path} -> {vn} = {vv}")
                except Exception:
                    pass
            for j in range(n_sub):
                try:
                    sk = winreg.EnumKey(k, j)
                    if 'aremas' in sk.lower():
                        print(f"[+] Reg Key: {hive_name}\\{path}\\{sk}")
                    search_key(hive, hive_name, f"{path}\\{sk}" if path else sk)
                except Exception:
                    pass
    except Exception:
        pass

print("Searching HKLM for aremas...")
for root_path in ["SYSTEM\\MountedDevices", "SYSTEM\\CurrentControlSet\\Services", "SYSTEM\\CurrentControlSet\\Control", "SOFTWARE\\Microsoft\\Windows"]:
    search_key(winreg.HKEY_LOCAL_MACHINE, "HKLM", root_path)
print("Done.")
