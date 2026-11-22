import winreg

print("[*] Probing DefaultAccount & FirstUserAccount registry hives...")
# The interactive console logon user is NOT DevToolsUser!
# It is DefaultAccount (Local Account / LA)
# Let's inspect HKEY_USERS
with winreg.OpenKey(winreg.HKEY_USERS, "") as k:
    n_sub, _, _ = winreg.QueryInfoKey(k)
    print(f"[+] Loaded HKEY_USERS hives ({n_sub}):")
    for i in range(n_sub):
        sub_name = winreg.EnumKey(k, i)
        print(f"    {sub_name}")

