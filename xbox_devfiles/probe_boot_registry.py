import winreg

print("[*] Probing Dev / Retail boot jumpers and mode configuration in Registry...")

targets = [
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\XboxLive"),
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Xbox"),
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon")
]

for root, path in targets:
    try:
        with winreg.OpenKey(root, path) as k:
            num_subkeys, num_vals, _ = winreg.QueryInfoKey(k)
            print(f"[+] Key found: {path} (vals: {num_vals})")
            for i in range(num_vals):
                name, val, typ = winreg.EnumValue(k, i)
                print(f"    {name} = {val}")
    except Exception as e:
        print(f"[-] {path}: {e}")

