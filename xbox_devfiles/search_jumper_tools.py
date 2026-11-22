import os
import subprocess

print("[*] Scanning system tool directories for boot mode, jumper, or retail switchers...")
dirs = [r"C:\Windows\System32", r"C:\xbdiag", r"J:\tools"]

keywords = ["retail", "devmode", "bootmode", "switch", "jumper", "reboot", "setmode", "xbcfg", "devcfg", "devkit"]

found = []
for d in dirs:
    if os.path.exists(d):
        try:
            for f in os.listdir(d):
                lf = f.lower()
                if any(k in lf for k in keywords):
                    found.append(os.path.join(d, f))
        except Exception as e:
            print(f"[-] {d}: {e}")

print(f"[+] Found {len(found)} candidate tools/binaries:")
for item in found[:30]:
    print(f"    {item}")

