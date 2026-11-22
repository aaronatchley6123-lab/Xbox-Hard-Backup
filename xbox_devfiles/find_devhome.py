import os

print("Searching for official Dev Home / Xbox Developer Menu...")
for root_dir in [r'X:\Apps', r'Y:\Apps', r'M:\windows', r'S:\apps', r'C:\Program Files', r'C:\Windows']:
    if os.path.exists(root_dir):
        try:
            for item in os.listdir(root_dir):
                if any(k in item.lower() for k in ['dev', 'home', 'shell', 'debug', 'xbox']):
                    print(f"  {root_dir} -> {item}")
        except Exception as e:
            print(f"  Err {root_dir}: {e}")

# Check Appx packages in repository or state repository
import winreg
for p in [r"SOFTWARE\Microsoft\Windows\CurrentVersion\Appx\AppxAllUserStore\Applications",
          r"SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\PackageRepository\Packages"]:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, p) as k:
            n_sub, _, _ = winreg.QueryInfoKey(k)
            print(f"\n=== Packages in {p} ({n_sub}) ===")
            for i in range(min(50, n_sub)):
                sk = winreg.EnumKey(k, i)
                if any(x in sk.lower() for x in ['dev', 'home', 'shell', 'xbox', 'microsoft']):
                    print(" ", sk)
    except Exception as e:
        print(f"Err {p}: {e}")

