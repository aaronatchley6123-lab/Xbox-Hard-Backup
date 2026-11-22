import winreg

# SIDs in HKEY_USERS
subkeys = []
try:
    with winreg.OpenKey(winreg.HKEY_USERS, "") as hk_users:
        i = 0
        while True:
            try:
                subkeys.append(winreg.EnumKey(hk_users, i))
                i += 1
            except OSError:
                break
except Exception as e:
    print(f"Error enumerating HKEY_USERS: {e}")

print(f"Found HKEY_USERS subkeys: {subkeys}")

# Write to HKLM Winlogon as well
try:
    with winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon") as k:
        winreg.SetValueEx(k, "Shell", 0, winreg.REG_SZ, r"D:\Windows11\Windows\explorerw.exe")
        winreg.SetValueEx(k, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
        winreg.SetValueEx(k, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
        print("[+] Set HKLM Winlogon keys successfully.")
except Exception as e:
    print(f"[-] HKLM Winlogon err: {e}")

# Target all user profiles with standard SID (S-1-5-21-...)
for sid in subkeys:
    if sid.startswith("S-1-5-21-") and not sid.endswith("_Classes"):
        print(f"[*] Configuring Winlogon for SID: {sid}")
        try:
            with winreg.CreateKey(winreg.HKEY_USERS, fr"{sid}\Software\Microsoft\Windows NT\CurrentVersion\Winlogon") as k:
                winreg.SetValueEx(k, "Shell", 0, winreg.REG_SZ, r"D:\Windows11\Windows\explorerw.exe")
                winreg.SetValueEx(k, "DisableClassicDesktop", 0, winreg.REG_DWORD, 0)
                winreg.SetValueEx(k, "UserMgrLaunchShell", 0, winreg.REG_DWORD, 1)
                print(f"[+] Successfully wrote shell keys for {sid}")
        except Exception as e:
            print(f"[-] Err writing to {sid}: {e}")
