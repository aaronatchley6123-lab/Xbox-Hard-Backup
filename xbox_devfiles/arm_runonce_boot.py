import winreg

print("[*] Arming CoutureOS Boot Menu into HKLM RunOnce & Winlogon Shell...")

# 1. Add to RunOnce (executed by system on startup before desktop loads)
runonce_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, runonce_path, 0, winreg.KEY_SET_VALUE | winreg.KEY_WOW64_64KEY) as k:
        cmd = r"cmd.exe /c start /b D:\DevelopmentFiles\couture_boot_menu.exe"
        winreg.SetValueEx(k, "CoutureOSBootMenu", 0, winreg.REG_SZ, cmd)
        print(f"[+] Set HKLM RunOnce\\CoutureOSBootMenu = {cmd}")
except Exception as e:
    print(f"[-] HKLM RunOnce error: {e}")

# 2. Add to HKCU RunOnce for active user
try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\RunOnce") as k:
        cmd = r"cmd.exe /c start /b D:\DevelopmentFiles\couture_boot_menu.exe"
        winreg.SetValueEx(k, "CoutureOSBootMenu", 0, winreg.REG_SZ, cmd)
        print(f"[+] Set HKCU RunOnce\\CoutureOSBootMenu = {cmd}")
except Exception as e:
    print(f"[-] HKCU RunOnce error: {e}")

