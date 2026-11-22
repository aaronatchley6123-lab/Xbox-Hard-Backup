import os, winreg

for path in [
    r"S:\Program Files\WindowsApps\XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap",
    r"S:\Program Files\WindowsApps\XBXOwned.XboxDevKitStudio_2.0.0.0_x64__czgs116rtv2ap",
    r"D:\DevelopmentFiles\LooseApps\FileExplorer",
    r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy"
]:
    print("=== DIR:", path)
    if os.path.exists(path):
        for f in os.listdir(path):
            fp = os.path.join(path, f)
            sz = os.path.getsize(fp) if os.path.isfile(fp) else -1
            print(f"  {f} ({sz} bytes)")
        m = os.path.join(path, "AppxManifest.xml")
        if os.path.exists(m):
            print("--- AppxManifest.xml ---")
            print(open(m, "r", encoding="utf-8", errors="ignore").read()[:1500])
    else:
        print("  DOES NOT EXIST")

for sub in [
    r"SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages\XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap",
    r"SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages\XBXOwned.XboxDevKitStudio_2.0.0.0_x64__czgs116rtv2ap",
    r"SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages\c5e2524a-ea46-4f67-841f-6a9465d9d515_10.0.26100.9445_neutral_neutral_cw5n1h2txyewy",
]:
    print("=== REG:", sub)
    try:
        k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, sub)
        i = 0
        while True:
            try:
                n, v, t = winreg.EnumValue(k, i)
                print(f"  {n} = {v}")
                i += 1
            except OSError:
                break
    except Exception as e:
        print("  ERR:", e)
