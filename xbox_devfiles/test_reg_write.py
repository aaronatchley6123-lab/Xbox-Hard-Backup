import winreg

keys_to_test = [
    (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\DOS Devices"),
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion"),
    (winreg.HKEY_LOCAL_MACHINE, r"OSDATA\XTF\XRO"),
    (winreg.HKEY_CURRENT_USER, r"Network"),
    (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run"),
]

for hkey, subkey in keys_to_test:
    try:
        with winreg.OpenKey(hkey, subkey, 0, winreg.KEY_SET_VALUE) as k:
            print(f"[+] WRITE ACCESS: {subkey}")
    except PermissionError:
        print(f"[-] Access Denied: {subkey}")
    except FileNotFoundError:
        print(f"[?] Not Found: {subkey}")
    except Exception as e:
        print(f"[!] Error {subkey}: {e}")
