import winreg
key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList")
i = 0
while True:
    try:
        sid = winreg.EnumKey(key, i)
        sk = winreg.OpenKey(key, sid)
        try:
            p, _ = winreg.QueryValueEx(sk, "ProfileImagePath")
        except Exception:
            p = "<none>"
        print(f"  {sid} -> {p}")
        i += 1
    except OSError:
        break
