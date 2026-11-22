import os
import ctypes
from ctypes import wintypes

print("[*] Probing pspsra.sys / AMD PSP communication channel...")

# Attempt to open device handle to PSP / SRA driver
# Common device paths for PSP/SRA: \\.\PspSra, \\.\Psp, \\.\AmdPsp, \\Device\\PspSra
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

CreateFileW = ctypes.windll.kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE

CloseHandle = ctypes.windll.kernel32.CloseHandle

candidates = [
    r"\\.\PspSra",
    r"\\.\Psp",
    r"\\.\AmdPsp",
    r"\\.\XboxPsp",
    r"\\.\Xpal",
    r"\\.\SpacePort",
    r"\\.\Psp0"
]

for name in candidates:
    h = CreateFileW(name, GENERIC_READ | GENERIC_WRITE, 0, None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
    if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
        print(f"[+] SUCCESS! Opened device handle to {name}: {h:#x}")
        CloseHandle(h)
    else:
        err = ctypes.GetLastError()
        print(f"[-] {name} -> Error code: {err} ({hex(err)})")

