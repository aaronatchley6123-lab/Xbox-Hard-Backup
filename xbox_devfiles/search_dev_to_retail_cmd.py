import os
import subprocess

print("[*] Searching Dev Home files and scripts for the exact 'Leave Dev Mode' or 'Switch to Retail' call...")
dev_home_path = r"M:\windows\DefaultApp"
if os.path.exists(dev_home_path):
    for root, dirs, files in os.walk(dev_home_path):
        for f in files:
            if f.endswith(".dll") or f.endswith(".exe") or f.endswith(".xbf") or f.endswith(".xaml"):
                p = os.path.join(root, f)
                try:
                    with open(p, "rb") as fl:
                        content = fl.read()
                        if any(k in content.lower() for k in [b"switch", b"retail", b"bootmode", b"leave", b"mode", b"sysos"]):
                            print(f"  Match in: {p}")
                except Exception:
                    pass

