import os, subprocess, winreg

print("=== SYSTEM & USER PATH IN REGISTRY ===")
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as k:
        print("HKLM PATH:", winreg.QueryValueEx(k, "Path")[0])
except Exception as e:
    print("HKLM PATH err:", e)

try:
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as k:
        print("HKCU PATH:", winreg.QueryValueEx(k, "Path")[0])
except Exception as e:
    print("HKCU PATH err:", e)
