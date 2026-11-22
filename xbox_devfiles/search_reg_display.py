import winreg

roots = [
    (winreg.HKEY_LOCAL_MACHINE, "HKLM", "SOFTWARE\\Microsoft"),
    (winreg.HKEY_LOCAL_MACHINE, "HKLM", "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers"),
    (winreg.HKEY_CURRENT_USER, "HKCU", "Software\\Microsoft"),
]

def search_key(hkey, root_name, subkey):
    try:
        with winreg.OpenKey(hkey, subkey) as k:
            i = 0
            while True:
                try:
                    name, val, typ = winreg.EnumValue(k, i)
                    i += 1
                    s_name = str(name).lower()
                    s_val = str(val).lower()
                    if any(target in s_name or target in s_val for target in ["colordepth", "36 bit", "tvresolution", "colorspace", "rgb"]):
                        print(f"[FOUND VALUE] {root_name}\\{subkey} -> {name} = {val}")
                except OSError:
                    break
            j = 0
            while True:
                try:
                    sub = winreg.EnumKey(k, j)
                    j += 1
                    search_key(hkey, root_name, f"{subkey}\\{sub}")
                except OSError:
                    break
    except OSError:
        pass

for hkey, rname, path in roots:
    search_key(hkey, rname, path)
print("[*] Registry search completed.")
