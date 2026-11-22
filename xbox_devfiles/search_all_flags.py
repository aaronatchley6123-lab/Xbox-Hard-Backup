import winreg
import os
import subprocess

print("====================================================")
print("[*] Scanning All System Handoff & Boot Mode Flags")
print("====================================================")

# 1. Search wdconfig all settings with their detailed descriptions
res = subprocess.run(["J:\\tools\\wdconfig.exe", "set"], capture_output=True, text=True)
lines = res.stdout.split("\n\n")
print(f"[+] Total wdconfig configurable settings: {len(lines)}")
for item in lines:
    item_lower = item.lower()
    if any(k in item_lower for k in ["mode", "boot", "handoff", "shell", "home", "era", "sra", "retail", "profile", "storage", "default", "title"]):
        print("----------------------------------------------------")
        print(item.strip())

