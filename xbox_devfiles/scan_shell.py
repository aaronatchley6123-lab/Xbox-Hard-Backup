import os

targets = [
    r"C:\Windows\System32\dwm.exe",
    r"C:\Windows\System32\sihost.exe",
    r"C:\Windows\System32\cmd.exe",
    r"C:\Windows\System32\taskmgr.exe",
    r"C:\Windows\explorer.exe"
]

for t in targets:
    print(f"{t:35s} -> exists: {os.path.exists(t)}")

