import winreg

print("[*] Arming HKCU Winlogon Shell to launch couture_boot_menu.exe directly...")

hkcu_winlogon = r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, hkcu_winlogon) as k:
        # Enable shell launch on user logon
        winreg.SetValueEx(k, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
        # Point Shell directly to boot menu
        cmd = r"cmd.exe /c start /b D:\DevelopmentFiles\couture_boot_menu.exe"
        winreg.SetValueEx(k, "Shell", 0, winreg.REG_SZ, cmd)
        print(f"[+] Successfully set HKCU Shell = {cmd}")
        print("[+] Successfully set HKCU UserMgrLaunchShell = 1")
except Exception as e:
    print(f"[-] HKCU Winlogon error: {e}")

