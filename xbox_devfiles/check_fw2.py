import os
p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe\framework\js\framework.js"
lines = open(p, "r", encoding="utf-8", errors="ignore").read().splitlines()
for i in range(4540, 4800):
    if i < len(lines):
        print(f"{i+1}: {lines[i]}")
