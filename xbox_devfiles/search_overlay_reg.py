import winreg

def search_key(hkey, subkey, target):
    try:
        with winreg.OpenKey(hkey, subkey) as k:
            num_subkeys, num_vals, _ = winreg.QueryInfoKey(k)
            for i in range(num_vals):
                name, val, _ = winreg.EnumValue(k, i)
                if isinstance(val, str) and target.lower() in val.lower():
                    print(f"Found in value: {subkey}\\{name} = {val}")
                elif target.lower() in name.lower():
                    print(f"Found in val name: {subkey}\\{name}")
            for i in range(num_subkeys):
                child = winreg.EnumKey(k, i)
                if target.lower() in child.lower():
                    print(f"Found in key: {subkey}\\{child}")
                search_key(hkey, f"{subkey}\\{child}", target)
    except:
        pass

print("Searching registry for DevHomeOverlay...")
search_key(winreg.HKEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft", "DevHomeOverlay")
search_key(winreg.HKEY_LOCAL_MACHINE, "SYSTEM\\CurrentControlSet", "DevHomeOverlay")
