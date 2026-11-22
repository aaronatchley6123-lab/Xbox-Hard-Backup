import os
p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe\framework\js\framework.js"
txt = open(p, "r", encoding="utf-8", errors="ignore").read()
for i, line in enumerate(txt.splitlines(), 1):
    if any(k in line.lower() for k in ["cert", "workspace", "toolwindow", "settings", "launch", "uwp", "era", "devkit", "shell", "8001"]):
        print(f"{i}: {line}")
