import winreg
import subprocess

print("[*] Probing persistent boot redirection mechanisms for DefaultApp...")

# 1. Check wdconfig DefaultApp options
res = subprocess.run(["J:\\tools\\wdconfig.exe", "set", "DefaultApp"], capture_output=True, text=True)
print("[+] wdconfig set DefaultApp:\n", res.stdout)

# 2. Check Winlogon Shell in HKCU / HKLM
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon") as k:
        shell, _ = winreg.QueryValueEx(k, "Shell")
        launch_shell, _ = winreg.QueryValueEx(k, "UserMgrLaunchShell")
        print(f"[+] HKLM Winlogon Shell: {shell} (UserMgrLaunchShell: {launch_shell})")
except Exception as e:
    print(f"[-] HKLM Winlogon: {e}")

