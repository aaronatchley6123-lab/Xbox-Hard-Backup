import winreg

def search_keys(hroot, subkey):
    try:
        with winreg.OpenKey(hroot, subkey) as k:
            i = 0
            while True:
                try:
                    val_name, val_data, val_type = winreg.EnumValue(k, i)
                    name_low = val_name.lower()
                    if 'min' in name_low or 'full' in name_low or 'classic' in name_low or 'desktop' in name_low:
                        print(f"{subkey} -> {val_name} = {val_data}")
                    i += 1
                except OSError:
                    break
            i = 0
            while True:
                try:
                    sk = winreg.EnumKey(k, i)
                    search_keys(hroot, f"{subkey}\\{sk}")
                    i += 1
                except OSError:
                    break
    except Exception as e:
        pass

print("Searching HKLM\\System\\XConfig:")
search_keys(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig")

print("\nSearching HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon:")
search_keys(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon")
