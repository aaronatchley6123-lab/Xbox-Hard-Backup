import subprocess
import os

print("====================================================")
print("[*] Auditing Windows 11 OneCore Complete OS Components")
print("====================================================")

# 1. Kernel Version & Build
cmd_ver = 'cmd.exe /c "ver"'
res_ver = subprocess.run(cmd_ver, shell=True, capture_output=True, text=True)
print(f"[+] Kernel Version: {res_ver.stdout.strip()}")

# 2. Check installed system capabilities and components
# OneCore 24H2 build 26100 is literally the exact same codebase as Windows 11 24H2 Desktop
# Check if ShellExperienceHost, StartMenu, or classic explorer exist in SystemApps or WinSxS
sys_apps = r"C:\Windows\SystemApps"
if os.path.exists(sys_apps):
    try:
        entries = os.listdir(sys_apps)
        print(f"\n[+] SystemApps installed on C:\\ ({len(entries)}):")
        for e in entries:
            print(f"    {e}")
    except Exception as e:
        print(f"[-] SystemApps error: {e}")

# Check M:\windows\SystemApps
m_sys_apps = r"M:\windows\SystemApps"
if os.path.exists(m_sys_apps):
    try:
        entries = os.listdir(m_sys_apps)
        print(f"\n[+] SystemApps installed on M:\\ ({len(entries)}):")
        for e in entries:
            print(f"    {e}")
    except Exception as e:
        print(f"[-] M:\\ SystemApps error: {e}")

