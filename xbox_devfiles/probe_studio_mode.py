import winreg
import os
import subprocess

print("====================================================")
print("[*] Probing Studio Mode & Studio Services Configuration")
print("====================================================")

# 1. Inspect xstudioserviceexe and xstudioclient in J:\tools
studio_tools = [r"J:\tools\xstudioserviceexe.exe", r"J:\tools\xstudioclient.dll", r"J:\tools\xstudioxcrdserviceexe.exe"]
for st in studio_tools:
    if os.path.exists(st):
        print(f"[+] Found Studio Tool: {st} ({os.path.getsize(st)} bytes)")

# 2. Check xpal export for Studio Mode
# XpalIsInternalDevkit / XpalGetConsoleMode (Mode 100 vs 200 = Studio)
import ctypes
xpal = ctypes.WinDLL("xpal.dll")
print(f"[+] Current ConsoleMode: {xpal.XpalGetConsoleMode():#x}")

# 3. Check wdconfig setting options for Studio
res = subprocess.run(["J:\\tools\\wdconfig.exe", "export"], capture_output=True, text=True)
studio_settings = [l for l in res.stdout.splitlines() if "studio" in l.lower()]
print(f"[+] Studio settings in wdconfig ({len(studio_settings)}):")
for ss in studio_settings:
    print(f"    {ss}")

