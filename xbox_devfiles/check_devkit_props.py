import winreg

paths = [
    r"SOFTWARE\Microsoft\Xbox\DevelopmentKit",
    r"SYSTEM\CurrentControlSet\Control\Xbox\DevelopmentKit",
    r"SYSTEM\XConfig",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Xbox"
]

for p in paths:
    print(f"\n--- Checking {p} ---")
    try:
        k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, p)
        i = 0
        while True:
            try:
                name, val, typ = winreg.EnumValue(k, i)
                print(f"  {name} = {val} ({typ})")
                i += 1
            except OSError:
                break
        winreg.CloseKey(k)
    except Exception as e:
        print(f"  Error: {e}")

