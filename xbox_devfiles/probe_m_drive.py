import os
import ctypes
from ctypes import wintypes

print("[*] Probing M:\\ volume, mount point, and volume manager...")

# 1. Query volume information
GetVolumeInformationW = ctypes.windll.kernel32.GetVolumeInformationW
GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD), wintypes.LPWSTR, wintypes.DWORD
]
GetVolumeInformationW.restype = wintypes.BOOL

vol_name = ctypes.create_unicode_buffer(256)
fs_name = ctypes.create_unicode_buffer(256)
serial = wintypes.DWORD(0)
max_len = wintypes.DWORD(0)
flags = wintypes.DWORD(0)

ok = GetVolumeInformationW(r"M:\\", vol_name, 256, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 256)
if ok:
    print(f"[+] M:\\ Volume Name: {vol_name.value}")
    print(f"    File System: {fs_name.value}")
    print(f"    Flags: {flags.value:#x}")
else:
    err = ctypes.GetLastError()
    print(f"[-] GetVolumeInformationW('M:\\') error: {err} ({hex(err)})")

# 2. Check QueryDosDeviceW for M:
QueryDosDeviceW = ctypes.windll.kernel32.QueryDosDeviceW
QueryDosDeviceW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
QueryDosDeviceW.restype = wintypes.DWORD

target_path = ctypes.create_unicode_buffer(1024)
res = QueryDosDeviceW("M:", target_path, 1024)
if res > 0:
    print(f"[+] DOS Device 'M:' maps to: {target_path.value}")
else:
    err = ctypes.GetLastError()
    print(f"[-] QueryDosDeviceW('M:') error: {err} ({hex(err)})")

# 3. Check memory status
class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", wintypes.DWORD),
        ("dwMemoryLoad", wintypes.DWORD),
        ("ullTotalPhys", ctypes.c_uint64),
        ("ullAvailPhys", ctypes.c_uint64),
        ("ullTotalPageFile", ctypes.c_uint64),
        ("ullAvailPageFile", ctypes.c_uint64),
        ("ullTotalVirtual", ctypes.c_uint64),
        ("ullAvailVirtual", ctypes.c_uint64),
        ("ullAvailExtendedVirtual", ctypes.c_uint64)
    ]

mem = MEMORYSTATUSEX()
mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
print(f"[*] Physical RAM: Total = {mem.ullTotalPhys / (1024**3):.2f} GB | Avail = {mem.ullAvailPhys / (1024**3):.2f} GB")
print(f"[*] Virtual Memory: Total = {mem.ullTotalVirtual / (1024**3):.2f} GB | Avail = {mem.ullAvailVirtual / (1024**3):.2f} GB")

