import winreg

def search(key, sub, target):
    try:
        h = winreg.OpenKey(key, sub)
        i = 0
        while True:
            try:
                name = winreg.EnumKey(h, i)
                i += 1
                if target.lower() in name.lower():
                    print(f"Found in {sub}: {name}")
            except OSError:
                break
    except: pass

search(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Classes\CLSID", "50e9199e")
search(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Classes\AppID", "50e9199e")
search(winreg.HKEY_CLASSES_ROOT, r"CLSID", "50e9199e")
search(winreg.HKEY_CLASSES_ROOT, r"AppID", "50e9199e")
print("[*] CLSID search complete.")
