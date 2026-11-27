import winreg
import os

print("[*] Switching Windows NT Winlogon Shell to Desktop Mode...", flush=True)

# 1. Target HKCU Winlogon (User-level override for DevToolsUser)
hkcu_winlogon_path = r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
try:
    k_user = winreg.CreateKey(winreg.HKEY_CURRENT_USER, hkcu_winlogon_path)
    
    # Enable UserMgrLaunchShell to 1 (Activates graphical shell launch)
    winreg.SetValueEx(k_user, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
    print("  [+] Set HKCU UserMgrLaunchShell = 1")

    # Set Shell to launch Desktop
    desktop_cmd = r'cmd.exe /c "start /b python D:\DevelopmentFiles\desktop_server.py"'
    winreg.SetValueEx(k_user, "Shell", 0, winreg.REG_SZ, desktop_cmd)
    print(f"  [+] Set HKCU Shell = {desktop_cmd}")

    winreg.CloseKey(k_user)
except Exception as e:
    print("[-] HKCU Winlogon error:", e)

# 2. Try HKLM Winlogon if writable
hklm_winlogon_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
try:
    k_lm = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, hklm_winlogon_path, 0, winreg.KEY_SET_VALUE | winreg.KEY_WOW64_64KEY)
    winreg.SetValueEx(k_lm, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
    print("  [+] Set HKLM UserMgrLaunchShell = 1")
    winreg.CloseKey(k_lm)
except Exception as e:
    print(f"  [-] Note on HKLM write (expected in non-elevated user token): {e}")

# 3. Read back verified state
k_check = winreg.OpenKey(winreg.HKEY_CURRENT_USER, hkcu_winlogon_path)
val_launch, _ = winreg.QueryValueEx(k_check, "UserMgrLaunchShell")
val_shell, _ = winreg.QueryValueEx(k_check, "Shell")
print(f"\n[VERIFIED LIVE STATE]")
print(f"  UserMgrLaunchShell: {val_launch}")
print(f"  Shell:              {val_shell}")
winreg.CloseKey(k_check)

print("\n[+] Desktop Shell switch successfully applied!", flush=True)
