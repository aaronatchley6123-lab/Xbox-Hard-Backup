import winreg

def check_reg(hive, hive_name, path):
    try:
        with winreg.OpenKey(hive, path) as k:
            print(f"EXISTS: {hive_name}\\{path}")
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            for i in range(n_val):
                print(" ", winreg.EnumValue(k, i))
            for i in range(n_sub):
                print("  Subkey:", winreg.EnumKey(k, i))
    except Exception as e:
        # print(f"Not in {hive_name}\\{path}: {e}")
        pass

for user in ["S-1-5-18", "S-1-5-21-0-0-0-1000", "S-1-5-21-0-0-0-500"]:
    check_reg(winreg.HKEY_USERS, f"HKU\\{user}", f"{user}\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\SystemAppData\\Microsoft.Xbox.DevHome_8wekyb3d8bbwe")

check_reg(winreg.HKEY_LOCAL_MACHINE, "HKLM", "SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\SystemAppData\\Microsoft.Xbox.DevHome_8wekyb3d8bbwe")
check_reg(winreg.HKEY_CURRENT_USER, "HKCU", "Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\SystemAppData\\Microsoft.Xbox.DevHome_8wekyb3d8bbwe")
