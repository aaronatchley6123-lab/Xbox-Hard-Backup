import os
p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe"
for rel in [
    r"toolwindows\compatMode\compatMode.js",
    r"toolwindows\performanceSettings\performanceSettings.js",
    r"toolwindows\consoleSettings\consoleSettings.js",
    r"toolwindows\commonActions\commonActions.js",
]:
    print("=========================================")
    print("FILE:", rel)
    print(open(os.path.join(p, rel), "r", encoding="utf-8", errors="ignore").read())
