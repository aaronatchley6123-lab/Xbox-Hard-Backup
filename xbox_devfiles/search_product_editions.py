import winreg
import subprocess

print("====================================================")
print("[*] Probing EditionID, Edition Substrings, and System Modes...")
print("====================================================")

# Search Windows NT CurrentVersion for EditionID & ProductName
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion") as k:
    n_sub, n_val, _ = winreg.QueryInfoKey(k)
    for i in range(n_val):
        name, val, _ = winreg.EnumValue(k, i)
        if any(w in name.lower() for w in ["edition", "product", "composition", "installation"]):
            print(f"  {name} = {val}")

# Check ProductPolicy strings for edition names (Server, Professional, Enterprise, Desktop, etc.)
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\ProductOptions") as k:
    pol_bytes, _ = winreg.QueryValueEx(k, "ProductPolicy")
    # Search for edition-like tokens in policy
    import re
    tokens = re.findall(b"[A-Za-z0-9_-]{4,}", pol_bytes)
    editions = [t.decode() for t in tokens if any(k in t.decode().lower() for k in ["desktop", "server", "enterprise", "workstation", "professional", "iot", "core", "devkit", "studio", "era", "sra"])]
    print(f"\n[+] Matched Edition Tokens in ProductPolicy ({len(editions)}):")
    for ed in sorted(set(editions))[:30]:
        print(f"    {ed}")

