import winreg

def read_key(root, subkey):
    print(f"=== {subkey} ===")
    try:
        k = winreg.OpenKey(root, subkey)
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

read_key(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment")
read_key(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\KnownDLLs")
read_key(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\explorer.exe")
