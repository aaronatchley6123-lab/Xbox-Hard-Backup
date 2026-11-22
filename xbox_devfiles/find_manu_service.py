import winreg

def search(key, sub=""):
    try:
        h = winreg.OpenKey(key, sub)
        i = 0
        while True:
            try:
                name = winreg.EnumKey(h, i)
                i += 1
                if "manu" in name.lower() or "broker" in name.lower():
                    print("Found service key:", name)
            except OSError:
                break
    except Exception as e:
        print("Error:", e)

search(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services")
