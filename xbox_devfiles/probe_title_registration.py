import winreg
import os

print("[*] Inspecting LooseApps pkg registration...")
# Check how Hermes was staged or registered
loose_dir = r"D:\DevelopmentFiles\LooseApps"
for root, dirs, files in os.walk(loose_dir):
    for f in files:
        if f.endswith(".cmd") or f.endswith(".bat") or f.endswith(".py"):
            p = os.path.join(root, f)
            print(f"  Script: {p}")

