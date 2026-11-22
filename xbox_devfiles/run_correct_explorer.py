import subprocess
import os

# Update test_patch_run.py to target D:\Windows\explorer.exe and D:\Windows
with open(r"D:\DevelopmentFiles\test_patch_run.py", "r") as f:
    code = f.read()

# Replace obsolete paths
code = code.replace(r"D:\Windows11\Windows\explorerw.exe", r"D:\Windows\explorer.exe")
code = code.replace(r"D:\Windows11\Windows", r"D:\Windows")

with open(r"D:\DevelopmentFiles\test_patch_run.py", "w") as f:
    f.write(code)

print("[+] Updated D:\\DevelopmentFiles\\test_patch_run.py to target D:\\Windows\\explorer.exe")

# Update D:\boot.cmd
with open(r"D:\boot.cmd", "r") as f:
    boot_cmd = f.read()

boot_cmd = boot_cmd.replace(r"D:\Windows11\Windows\explorerw.exe", r"D:\Windows\explorer.exe")
boot_cmd = boot_cmd.replace(r"D:\Windows11", r"D:\Windows")

with open(r"D:\boot.cmd", "w") as f:
    f.write(boot_cmd)

print("[+] Updated D:\\boot.cmd to target D:\\Windows")

# Update D:\DevelopmentFiles\hermes_bridge.py
with open(r"D:\DevelopmentFiles\hermes_bridge.py", "r") as f:
    bridge_code = f.read()

bridge_code = bridge_code.replace(r"D:\Windows11\Windows\explorerw.exe", r"D:\Windows\explorer.exe")
bridge_code = bridge_code.replace(r"\??\D:\Windows11", r"\??\D:\Windows")

with open(r"D:\DevelopmentFiles\hermes_bridge.py", "w") as f:
    f.write(bridge_code)

print("[+] Updated D:\\DevelopmentFiles\\hermes_bridge.py to target D:\\Windows")
