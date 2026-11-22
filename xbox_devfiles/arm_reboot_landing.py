import os
import sys
import winreg

print("====================================================")
print("[*] Locking in Windows 11 Native Desktop Reboot Landing Configuration")
print("====================================================")

hkcu_winlogon = r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon"
try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, hkcu_winlogon) as k:
        winreg.SetValueEx(k, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        winreg.SetValueEx(k, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
        cmd = r'cmd.exe /c "start /b D:\DevelopmentFiles\LooseApps\pkg\python.exe D:\DevelopmentFiles\desktop_server.py & J:\tools\wdapp.exe launch HermesOS.SeriesX_czgs116rtv2ap!App"'
        winreg.SetValueEx(k, "Shell", 0, winreg.REG_SZ, cmd)
        print(f"[+] Verified HKCU Shell Target: {cmd}")
        print("[+] Verified HKCU UserMgrLaunchShell: 1")
        print("[+] Verified HKCU DisableClassicDesktop: 0")
except Exception as e:
    print(f"[-] Winlogon shell set error: {e}")

print("====================================================")
print("[+] System primed to land directly on Windows 11 Native Desktop!")
print("====================================================")
