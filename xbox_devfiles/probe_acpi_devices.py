import subprocess
import os

print("[*] Probing Windows PnP / ACPI devices via PowerShell / WMI...")
ps_cmd = "Get-CimInstance Win32_PnPEntity | Select-Object Name, DeviceID | Format-Table -AutoSize"
try:
    res = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, text=True, timeout=15)
    print(res.stdout[:2000])
except Exception as e:
    print(f"Error: {e}")

