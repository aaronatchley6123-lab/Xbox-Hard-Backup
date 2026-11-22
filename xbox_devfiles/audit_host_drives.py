import os
import ctypes
from ctypes import wintypes

GetVolumeInformationW = ctypes.windll.kernel32.GetVolumeInformationW
GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(wintypes.DWORD), wintypes.LPWSTR, wintypes.DWORD
]
GetVolumeInformationW.restype = wintypes.BOOL

drives = ['C:', 'D:', 'G:', 'J:', 'K:', 'M:', 'N:', 'O:', 'Q:', 'S:', 'T:', 'U:', 'V:', 'X:', 'Y:']

print("====================================================")
print("[*] Storage Topology Across All 15 Hardware Volumes")
print("====================================================")

for d in drives:
    vol_name = ctypes.create_unicode_buffer(256)
    fs_name = ctypes.create_unicode_buffer(256)
    serial = wintypes.DWORD(0)
    max_len = wintypes.DWORD(0)
    flags = wintypes.DWORD(0)

    ok = GetVolumeInformationW(d + "\\", vol_name, 256, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 256)
    if ok:
        print(f"  {d} -> Volume: '{vol_name.value}' | FS: {fs_name.value} | Flags: {flags.value:#x}")
    else:
        err = ctypes.GetLastError()
        print(f"  {d} -> Error: {err}")

