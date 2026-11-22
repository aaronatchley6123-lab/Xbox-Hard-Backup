import winreg

print("[*] Setting all correct paths in HKCU\\Environment...")

k_env = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Environment")

env_vars = {
    "Path": r"D:\Windows\System32;D:\Windows;D:\Program Files;D:\Program Files (x86);J:\tools;C:\Windows;C:\Windows\system32",
    "windir": r"D:\Windows",
    "SystemRoot": r"D:\Windows",
    "SystemDrive": r"D:",
    "ProgramFiles": r"D:\Program Files",
    "ProgramFiles(x86)": r"D:\Program Files (x86)",
    "ProgramW6432": r"D:\Program Files",
    "CommonProgramFiles": r"D:\Program Files\Common Files",
    "CommonProgramFiles(x86)": r"D:\Program Files (x86)\Common Files",
    "CommonProgramW6432": r"D:\Program Files\Common Files"
}

for var_name, var_val in env_vars.items():
    winreg.SetValueEx(k_env, var_name, 0, winreg.REG_EXPAND_SZ, var_val)
    print(f"  [+] {var_name:25s} = {var_val}")

winreg.CloseKey(k_env)

# Configure all App Paths
app_paths = {
    "explorer.exe": (r"D:\Windows\explorer.exe", r"D:\Windows\System32;D:\Windows"),
    "cmd.exe": (r"D:\Windows\System32\cmd.exe", r"D:\Windows\System32;D:\Windows"),
    "taskmgr.exe": (r"D:\Windows\System32\Taskmgr.exe", r"D:\Windows\System32;D:\Windows"),
    "powershell.exe": (r"D:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe", r"D:\Windows\System32;D:\Windows"),
    "regedit.exe": (r"D:\Windows\regedit.exe", r"D:\Windows\System32;D:\Windows"),
    "control.exe": (r"D:\Windows\System32\control.exe", r"D:\Windows\System32;D:\Windows"),
    "notepad.exe": (r"D:\Windows\notepad.exe", r"D:\Windows\System32;D:\Windows")
}

print("[*] Setting App Paths in HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths...")
for app_exe, (app_target, app_p) in app_paths.items():
    sub = rf"Software\Microsoft\Windows\CurrentVersion\App Paths\{app_exe}"
    k_app = winreg.CreateKey(winreg.HKEY_CURRENT_USER, sub)
    winreg.SetValueEx(k_app, "", 0, winreg.REG_SZ, app_target)
    winreg.SetValueEx(k_app, "Path", 0, winreg.REG_SZ, app_p)
    winreg.CloseKey(k_app)
    print(f"  [+] {app_exe:15s} -> {app_target}")

print("[+] All paths correctly registered!")
