import os
p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe\framework\js\framework.js"
lines = open(p, "r", encoding="utf-8", errors="ignore").read().splitlines()
for i, line in enumerate(lines, 1):
    if any(k in line for k in ["_certType", "_fullCertType", "_consoleType", "Cert.", "ConsoleType.", "uwaDevkit"]):
        print(f"{i}: {line}")
