import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GetDiskFreeSpaceExW = kernel32.GetDiskFreeSpaceExW
GetDiskFreeSpaceExW.argtypes = [
    wintypes.LPCWSTR,
    ctypes.POINTER(ctypes.c_uint64),
    ctypes.POINTER(ctypes.c_uint64),
    ctypes.POINTER(ctypes.c_uint64)
]
GetDiskFreeSpaceExW.restype = wintypes.BOOL

GetVolumeInformationW = kernel32.GetVolumeInformationW
GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
    wintypes.LPDWORD, wintypes.LPDWORD, wintypes.LPDWORD,
    wintypes.LPWSTR, wintypes.DWORD
]
GetVolumeInformationW.restype = wintypes.BOOL

print("=== Checking All Mapped Drive Capacities ===")
for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    root = f"{letter}:\\"
    free_b = ctypes.c_uint64()
    total_b = ctypes.c_uint64()
    total_free_b = ctypes.c_uint64()
    if GetDiskFreeSpaceExW(root, ctypes.byref(free_b), ctypes.byref(total_b), ctypes.byref(total_free_b)):
        vol_name = ctypes.create_unicode_buffer(260)
        fs_name = ctypes.create_unicode_buffer(260)
        GetVolumeInformationW(root, vol_name, 260, None, None, None, fs_name, 260)
        total_gb = total_b.value / (1024**3)
        free_gb = free_b.value / (1024**3)
        print(f"Drive {letter}: | Label: '{vol_name.value}' | FS: {fs_name.value} | Total: {total_gb:.2f} GB | Free: {free_gb:.2f} GB")

print("\n=== Checking All HarddiskVolumes 1..25 Capacities ===")
for i in range(1, 26):
    root = f"\\\\?\\GLOBALROOT\\Device\\HarddiskVolume{i}\\"
    free_b = ctypes.c_uint64()
    total_b = ctypes.c_uint64()
    total_free_b = ctypes.c_uint64()
    if GetDiskFreeSpaceExW(root, ctypes.byref(free_b), ctypes.byref(total_b), ctypes.byref(total_free_b)):
        vol_name = ctypes.create_unicode_buffer(260)
        fs_name = ctypes.create_unicode_buffer(260)
        GetVolumeInformationW(root, vol_name, 260, None, None, None, fs_name, 260)
        total_gb = total_b.value / (1024**3)
        free_gb = free_b.value / (1024**3)
        print(f"HarddiskVolume{i} | Label: '{vol_name.value}' | FS: {fs_name.value} | Total: {total_gb:.2f} GB | Free: {free_gb:.2f} GB")
    else:
        err = ctypes.get_last_error()
        if err != 2 and err != 3:
            print(f"HarddiskVolume{i} | Status/Error: {err}")
