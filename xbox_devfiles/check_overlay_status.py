import os, subprocess

fw = r"D:\DevelopmentFiles\DevHomeOverlay\framework\js\framework.js"
if os.path.exists(fw):
    code = open(fw, "r", encoding="utf-8", errors="ignore").read()
    for i, line in enumerate(code.splitlines(), 1):
        if any(k in line for k in ["_getDefaultSettingsAsync", "xbdh-customized", "uwaDevkit", "_consoleType = utils.ConsoleType"]):
            print(f"Overlay framework.js:{i}: {line}")

print("\nTesting wdapp overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\\DevelopmentFiles\\DevHomeOverlay:")
print(subprocess.getoutput(r'J:\tools\wdapp.exe overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\DevelopmentFiles\DevHomeOverlay'))
