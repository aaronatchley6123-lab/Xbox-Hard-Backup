import winreg
import os
import subprocess

print("[*] Probing remote management services, certificates, and provisioning ports...")

services = [
    "xstudioclient",
    "xstudioserviceexe",
    "xbdiagservice",
    "WdpService",
    "DevkitAgent"
]

for s in services:
    path = r"SYSTEM\CurrentControlSet\Services\\" + s
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path) as k:
            image_path, _ = winreg.QueryValueEx(k, "ImagePath")
            start_type, _ = winreg.QueryValueEx(k, "Start")
            print(f"[+] Service: {s} -> Image: {image_path} (Start: {start_type})")
    except Exception:
        pass

res = subprocess.run(["J:\\tools\\wdconfig.exe", "export"], capture_output=True, text=True)
for line in res.stdout.splitlines():
    if any(k in line.lower() for k in ["agent", "cert", "mode", "remote", "sandbox", "relyingparty", "serviceuri", "enable"]):
        print(f"  {line}")

