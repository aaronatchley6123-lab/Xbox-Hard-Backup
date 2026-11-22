import ctypes, os, string

mask = ctypes.windll.kernel32.GetLogicalDrives()
drives = [string.ascii_uppercase[i] for i in range(26) if (mask >> i) & 1]

candidates = [
    "Windows", "Windows/System32", "tools", "boot", "Xbox", "Users",
    "Users/Default", "Users/Public", "ProgramData", "Program Files",
    "DevelopmentFiles", "Temp", "Logs", "Models", "Titles", "Packages",
    "System", "Config", "Recovery", "EFI", "update", "xbdiag", "CrashDumps",
    "SharedData", "AppData", "SRA", "Host", "VMM", "Certificates", "Certs"
]

for d in drives:
    if d == "D":
        continue
    found = []
    for sub in candidates:
        p = f"{d}:/{sub}"
        try:
            items = os.listdir(p)
            found.append((sub, len(items), items[:8]))
        except Exception:
            pass
    if found:
        print(f"=== Drive {d}: ===")
        for sub, count, sample in found:
            print(f"  [+] {d}:/{sub} ({count} items): {sample}")
    else:
        print(f"[-] Drive {d}: no candidate subdirs readable")
