import winreg
import os
import ctypes

print("[*] Setting up VMM & Bridge Persistence on Xbox Series X...", flush=True)

# 1. Unattend.cmd on D: drive (Xbox OS executes D:\unattend.cmd on boot/first-login)
unattend_content = """@echo off
echo [%date% %time%] Unattended boot triggered >> D:\\DevelopmentFiles\\unattend_boot_log.txt
start /b cmd /c "python D:\\DevelopmentFiles\\hermes_bridge.py >> D:\\DevelopmentFiles\\bridge.log 2>&1"
start /b cmd /c "python D:\\DevelopmentFiles\\vmm_control_client.py >> D:\\DevelopmentFiles\\vmm_boot.log 2>&1"
"""
with open("D:\\unattend.cmd", "w") as f:
    f.write(unattend_content)
print("[+] Created D:\\unattend.cmd hook")

# 2. HKCU Run registry persistence
try:
    k_run = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run")
    winreg.SetValueEx(k_run, "HermesBridge", 0, winreg.REG_SZ, r'cmd /c "python D:\DevelopmentFiles\hermes_bridge.py"')
    winreg.SetValueEx(k_run, "VMMClient", 0, winreg.REG_SZ, r'cmd /c "python D:\DevelopmentFiles\vmm_control_client.py"')
    print("[+] Registered in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run")
except Exception as e:
    print("[-] Registry Run error:", e)

# 3. Startup Folder persistence on Q: drive (DevToolsUser persistent user profile)
startup_dir = r"Q:\Users\DevToolsUser\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
try:
    os.makedirs(startup_dir, exist_ok=True)
    batch_path = os.path.join(startup_dir, "launch_hermes.bat")
    with open(batch_path, "w") as f:
        f.write("@echo off\n")
        f.write('start /b cmd /c "python D:\\DevelopmentFiles\\hermes_bridge.py"\n')
        f.write('start /b cmd /c "python D:\\DevelopmentFiles\\vmm_control_client.py"\n')
    print(f"[+] Startup batch script created at: {batch_path}")
except Exception as e:
    print("[-] Startup folder error:", e)

# 4. Immediate execution of vmm_control_client / driver initialization
print("[*] Testing vmm client control execution now...", flush=True)
import query_vmm_ioctls
print("[+] Persistence and VMM control setup complete!", flush=True)
