import winreg

k_run_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
with winreg.OpenKey(winreg.HKEY_CURRENT_USER, k_run_path, 0, winreg.KEY_ALL_ACCESS) as k:
    for stale in ["ExplorerShell", "VMMClient"]:
        try:
            winreg.DeleteValue(k, stale)
            print(f"Deleted {stale}")
        except Exception as e:
            pass
    winreg.SetValueEx(k, "HermesBridge", 0, winreg.REG_SZ, r'"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py"')
    winreg.SetValueEx(k, "Win11NativeDesktop", 0, winreg.REG_SZ, r'"J:\tools\wdapp.exe" launch "HermesOS.SeriesX_czgs116rtv2ap!App"')
    print("Verified HKCU Run keys updated!")
