import winreg

print("[*] Probing AppModelUnlock and developer unlocking keys...")
targets = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows\Appx"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\XboxLive\Sandbox")
]

for root, path in targets:
    try:
        with winreg.OpenKey(root, path) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            print(f"[+] Key found: {path} ({n_val} values):")
            for i in range(n_val):
                name, val, _ = winreg.EnumValue(k, i)
                print(f"    {name} = {val}")
    except Exception as e:
        print(f"[-] {path}: {e}")

