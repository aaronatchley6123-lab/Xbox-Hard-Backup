import winreg

try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\SubSystems")
    i = 0
    print("Session Manager\\SubSystems:")
    while True:
        try:
            name, val, typ = winreg.EnumValue(k, i)
            print(f"  {name:15s} = {val}")
            i += 1
        except OSError:
            break
except Exception as e:
    print(f"Error: {e}")
