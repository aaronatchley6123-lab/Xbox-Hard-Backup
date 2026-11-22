import winreg

with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList") as pl:
    i = 0
    while True:
        try:
            sid = winreg.EnumKey(pl, i)
            i += 1
            try:
                with winreg.OpenKey(pl, sid) as k:
                    path, _ = winreg.QueryValueEx(k, "ProfileImagePath")
                    print(f"{sid:50s} -> {path}")
            except Exception as e:
                print(f"{sid:50s} -> [err {e}]")
        except OSError:
            break
