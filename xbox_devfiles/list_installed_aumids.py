import winreg

print("[*] Probing registered AppX packages and AUMIDs...")

paths = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Classes\AppUserModelId"),
    (winreg.HKEY_CURRENT_USER, r"Software\Classes\AppUserModelId"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Appx\AppxAllUserStore\Applications")
]

for hkey, p in paths:
    try:
        with winreg.OpenKey(hkey, p) as k:
            num_subkeys, num_vals, _ = winreg.QueryInfoKey(k)
            print(f"[+] Found {num_subkeys} entries in {p}")
            for i in range(min(num_subkeys, 30)):
                sk = winreg.EnumKey(k, i)
                print(f"    {sk}")
    except Exception as e:
        print(f"[-] {p}: {e}")

