import subprocess
import os

print("[*] Checking drive properties via PowerShell...", flush=True)
pwsh = r"D:\DevelopmentFiles\powershell\pwsh.exe"
if os.path.exists(pwsh):
    cmd = [pwsh, "-Command", "Get-Volume | Select-Object DriveLetter, FileSystemLabel, FileSystem, DriveType, HealthStatus; Get-Disk | Select-Object Number, FriendlyName, IsReadOnly, IsOffline"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Volumes & Disks:\n", res.stdout)
    if res.stderr:
        print("Stderr:\n", res.stderr)
else:
    print("pwsh.exe not found")
