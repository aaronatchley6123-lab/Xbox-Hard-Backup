import winreg

paths = [
    r"Software\Microsoft\Windows\CurrentVersion\Policies\DataCollection",
    r"Software\Policies\Microsoft\Windows\DataCollection",
]

for p in paths:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, p) as k:
            print(f"[+] Found HKLM\\{p}:")
            i = 0
            while True:
                try:
                    name, val, typ = winreg.EnumValue(k, i)
                    print(f"    {name} = {val} (type={typ})")
                    i += 1
                except OSError:
                    break
    except FileNotFoundError:
        print(f"[-] Not found: HKLM\\{p}")
    except Exception as e:
        print(f"[-] Err: {e}")
