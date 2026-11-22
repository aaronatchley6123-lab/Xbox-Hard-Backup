import winreg

print("=== Checking WorkplaceJoin Registry Keys ===")
paths = [
    r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\WorkplaceJoin",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\CDJ",
    r"SOFTWARE\Policies\Microsoft\Windows\WorkplaceJoin",
    r"SYSTEM\CurrentControlSet\Control\WorkplaceJoin",
]

for p in paths:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, p) as k:
            print(f"[+] Found HKLM\\{p}")
            i = 0
            while True:
                try:
                    name, val, typ = winreg.EnumValue(k, i)
                    print(f"    Value: {name} = {val} (type={typ})")
                    i += 1
                except OSError:
                    break
            j = 0
            while True:
                try:
                    sk = winreg.EnumKey(k, j)
                    print(f"    Subkey: {sk}")
                    j += 1
                except OSError:
                    break
    except FileNotFoundError:
        print(f"[-] Not found: HKLM\\{p}")
    except Exception as e:
        print(f"[-] Err: {e}")

