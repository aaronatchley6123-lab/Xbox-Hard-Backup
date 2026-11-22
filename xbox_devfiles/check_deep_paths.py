import os

deep_paths = [
    "M:/windows",
    "M:/windows/system32",
    "M:/windows/DefaultApp",
    "M:/windows/SystemApps",
    "M:/windows/system32/XboxDevService.exe",
    "N:/ProgramData/Microsoft",
    "N:/ProgramData/Microsoft/Diagnosis",
    "N:/ProgramData/Microsoft/Diagnosis/DownloadedScenarios",
    "N:/ProgramData/Microsoft/Diagnosis/DownloadedSettings",
    "O:/MSXC",
    "Q:/Users/DevToolsUser",
    "Q:/Users/DevToolsUser/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup",
    "S:/Program Files",
    "S:/Program Files/WindowsApps",
    "U:/ShellState",
    "X:/Apps",
    "X:/Apps/DevHome",
    "X:/ht",
]

for p in deep_paths:
    try:
        if os.path.isdir(p):
            items = os.listdir(p)
            print(f"[+] DIR  {p} ({len(items)} items): {items[:10]}")
        elif os.path.exists(p):
            print(f"[+] FILE {p} ({os.path.getsize(p)} bytes)")
        else:
            print(f"[-] MISS {p}")
    except Exception as e:
        print(f"[-] ERR  {p}: {e}")
