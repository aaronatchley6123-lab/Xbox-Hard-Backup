import winreg

paths = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"),
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Server\ServerLevels")
]

for hive, subkey in paths:
    try:
        k = winreg.OpenKey(hive, subkey)
        print(f"\n[+] {subkey}:")
        i = 0
        while True:
            try:
                name, val, typ = winreg.EnumValue(k, i)
                if any(x in name.lower() for x in ['shell', 'userinit', 'mode', 'level', 'auto']):
                    print(f"    {name} = {val}")
                i += 1
            except OSError:
                break
        winreg.CloseKey(k)
    except Exception as e:
        print(f"[-] {subkey}: {e}")

