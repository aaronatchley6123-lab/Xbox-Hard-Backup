import winreg

try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\KnownDLLs")
    i = 0
    print("Registry KnownDLLs:")
    while True:
        try:
            name, val, typ = winreg.EnumValue(k, i)
            print(f"  {name:20s} = {val}")
            i += 1
        except OSError:
            break
except Exception as e:
    print(f"Error opening KnownDLLs key: {e}")
