import os

p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe"
for rel in [
    r"toolwindows\defaultApp\defaultapp.js",
    r"toolwindows\defaultApp\defaultapp.html",
    r"toolwindows\debugSettings\debugSettings.js",
    r"toolwindows\consoleSettings\consoleSettings.js",
    r"toolwindows\commonActions\commonActions.js",
    r"framework\js\framework.js",
]:
    fp = os.path.join(p, rel)
    print("=========================================")
    print("FILE:", rel)
    print(open(fp, "r", encoding="utf-8", errors="ignore").read()[:4000])
