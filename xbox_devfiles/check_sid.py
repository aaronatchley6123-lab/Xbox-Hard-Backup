import winreg

sid = "S-1-5-21-2702878673-795188819-444038987-1009"
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, fr"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\{sid}") as k:
        path, _ = winreg.QueryValueEx(k, "ProfileImagePath")
        print(f"SID {sid} ProfileImagePath: {path}")
except Exception as e:
    print(f"Error checking {sid}: {e}")
