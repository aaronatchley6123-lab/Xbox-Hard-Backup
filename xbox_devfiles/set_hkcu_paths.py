import winreg

# 1. Update HKCU\Environment Path
try:
    k_env = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Environment")
    existing_path = ""
    try:
        existing_path, _ = winreg.QueryValueEx(k_env, "Path")
    except OSError:
        pass
    
    new_prefix = r"D:\Windows\System32;D:\Windows;D:\Program Files;"
    if not existing_path.startswith(new_prefix):
        combined_path = new_prefix + existing_path
        winreg.SetValueEx(k_env, "Path", 0, winreg.REG_EXPAND_SZ, combined_path)
        print(f"[+] HKCU\\Environment Path updated to: {combined_path}")
    else:
        print(f"[i] HKCU\\Environment Path already contains prefix: {existing_path}")
    winreg.CloseKey(k_env)
except Exception as e:
    print(f"[-] Error setting HKCU\\Environment: {e}")

# 2. Add App Paths for explorer.exe in HKCU
try:
    k_app = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\App Paths\explorer.exe")
    winreg.SetValueEx(k_app, "", 0, winreg.REG_SZ, r"D:\Windows\explorer.exe")
    winreg.SetValueEx(k_app, "Path", 0, winreg.REG_SZ, r"D:\Windows\System32;D:\Windows")
    print(r"[+] HKCU App Paths\explorer.exe configured to D:\Windows\explorer.exe")
    winreg.CloseKey(k_app)
except Exception as e:
    print(f"[-] Error setting App Paths: {e}")

# 3. Add App Paths for cmd.exe in HKCU
try:
    k_cmd = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\App Paths\cmd.exe")
    winreg.SetValueEx(k_cmd, "", 0, winreg.REG_SZ, r"D:\Windows\System32\cmd.exe")
    winreg.SetValueEx(k_cmd, "Path", 0, winreg.REG_SZ, r"D:\Windows\System32;D:\Windows")
    print(r"[+] HKCU App Paths\cmd.exe configured to D:\Windows\System32\cmd.exe")
    winreg.CloseKey(k_cmd)
except Exception as e:
    print(f"[-] Error setting cmd App Paths: {e}")
