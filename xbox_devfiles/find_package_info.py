import winreg
import os

# Check AppRepository in registry
try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\StateRepository\Cache\Package\Index\PackageFullName\XBXOwned.XboxDevKitStudio_2.0.0.0_x64__czgs116rtv2ap")
    print("Found StateRepository key for XboxDevKitStudio!")
except Exception as e:
    pass

# Search for package directory
for d in [r"D:\DevelopmentFiles\WindowsApps", r"D:\DevelopmentFiles", r"D:\WindowsApps", r"C:\Program Files\WindowsApps"]:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            if any("XboxDevKitStudio" in x for x in dirs + files):
                print(f"Found in {root}")
                for f in files:
                    print(f"  {f}")
                break
