import subprocess
import os

print("====================================================")
print("[*] Auditing What Process Actually Spawns Dev Home...")
print("====================================================")

# Search running processes or services responsible for launching Dev Home
# On Xbox OneCore, SIHost (Shell Infrastructure Host) or UserMgr manages the visual shell
# In HKLM Winlogon: ShellInfrastructure = sihost.exe
# Let's inspect sihost and how it decides to launch DefaultApp.exe vs Shell
import winreg
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon") as k:
    n_sub, n_val, _ = winreg.QueryInfoKey(k)
    for i in range(n_val):
        name, val, _ = winreg.EnumValue(k, i)
        print(f"  HKLM Winlogon: {name} = {val}")

# Check which user account logs on interactively
# We found AutoSignInUser in wdconfig!
