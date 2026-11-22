import os

for p in [
    r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe\framework\js\framework.js",
    r"X:\Apps\DevHome\framework\js\framework.js",
]:
    print("=== PATH:", p, "exists:", os.path.exists(p))
    if os.path.exists(p):
        print("  size:", os.path.getsize(p))
        try:
            with open(p, "a") as f:
                pass
            print("  WRITABLE: YES")
        except Exception as e:
            print("  WRITABLE: NO ->", e)

# Also check DevHome AppData folder!
appdata_root = r"S:\Users"
if os.path.exists(appdata_root):
    for root, dirs, files in os.walk(appdata_root):
        if "DevHome" in root or "devHomeAppSettings" in str(files):
            print("  APPDATA:", root, files)
