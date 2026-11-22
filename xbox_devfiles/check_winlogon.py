import winreg

def read_winlogon(root_key, root_name):
    print(f"=== {root_name}\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon ===")
    try:
        k = winreg.OpenKey(root_key, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon")
        i = 0
        while True:
            try:
                name, val, typ = winreg.EnumValue(k, i)
                print(f"  {name:25s} = {val}")
                i += 1
            except OSError:
                break
    except Exception as e:
        print(f"  Error: {e}")

read_winlogon(winreg.HKEY_LOCAL_MACHINE, "HKLM")
read_winlogon(winreg.HKEY_CURRENT_USER, "HKCU")
