import subprocess
import os

print("[*] Probing Boot Configuration Data (BCD) and NVRAM boot entries...")

# Check bcdedit
try:
    res = subprocess.run(["bcdedit", "/enum", "all"], capture_output=True, text=True)
    if res.stdout:
        print("[+] bcdedit output:")
        print(res.stdout[:1500])
    else:
        print(f"[-] bcdedit stderr: {res.stderr}")
except Exception as e:
    print(f"[-] bcdedit error: {e}")

# Check firmware NVRAM variables via kernel32 GetFirmwareEnvironmentVariableW
import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
GetFirmwareEnvironmentVariableW = kernel32.GetFirmwareEnvironmentVariableW
GetFirmwareEnvironmentVariableW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPVOID, wintypes.DWORD]
GetFirmwareEnvironmentVariableW.restype = wintypes.DWORD

buf = (ctypes.c_ubyte * 1024)()
# Typical Microsoft Xbox EFI GUID: {77fa9abd-0359-4d32-bd60-28f4e78f784b}
res = GetFirmwareEnvironmentVariableW("BootMode", "{77fa9abd-0359-4d32-bd60-28f4e78f784b}", buf, 1024)
err = ctypes.GetLastError()
print(f"[*] GetFirmwareEnvironmentVariableW('BootMode'): res={res}, err={err} ({hex(err)})")

