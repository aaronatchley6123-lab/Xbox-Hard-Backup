import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GetVolumeInformationW = kernel32.GetVolumeInformationW
GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
    wintypes.LPDWORD, wintypes.LPDWORD, wintypes.LPDWORD,
    wintypes.LPWSTR, wintypes.DWORD
]
GetVolumeInformationW.restype = wintypes.BOOL

GetDiskFreeSpaceExW = kernel32.GetDiskFreeSpaceExW
GetDiskFreeSpaceExW.argtypes = [
    wintypes.LPCWSTR,
    ctypes.POINTER(ctypes.c_uint64),
    ctypes.POINTER(ctypes.c_uint64),
    ctypes.POINTER(ctypes.c_uint64)
]
GetDiskFreeSpaceExW.restype = wintypes.BOOL

unmapped_volumes = [10, 12, 16, 17, 19]

print("=== Investigating Unmapped Volumes (10, 12, 16, 17, 19) ===")

for num in unmapped_volumes:
    path = f"\\\\?\\GLOBALROOT\\Device\\HarddiskVolume{num}\\"
    vol_name = ctypes.create_unicode_buffer(260)
    fs_name = ctypes.create_unicode_buffer(260)
    serial = wintypes.DWORD()
    max_len = wintypes.DWORD()
    flags = wintypes.DWORD()
    
    ok = GetVolumeInformationW(path, vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
    
    free_bytes = ctypes.c_uint64()
    total_bytes = ctypes.c_uint64()
    total_free = ctypes.c_uint64()
    
    space_ok = GetDiskFreeSpaceExW(path, ctypes.byref(free_bytes), ctypes.byref(total_bytes), ctypes.byref(total_free))
    
    print(f"\n--- HarddiskVolume{num} ---")
    if ok:
        print(f"  Label: '{vol_name.value}'")
        print(f"  FileSystem: {fs_name.value}")
        print(f"  Serial: 0x{serial.value:08X}")
        if space_ok:
            total_gb = total_bytes.value / (1024**3)
            free_gb = free_bytes.value / (1024**3)
            print(f"  Capacity: {total_gb:.2f} GB (Free: {free_gb:.2f} GB)")
    else:
        err = ctypes.get_last_error()
        print(f"  GetVolumeInformation failed: Error code {err}")
        
    # Try listing files in root
    try:
        files = os.listdir(path)
        print(f"  Root items ({len(files)}):", files[:10])
    except Exception as e:
        print(f"  os.listdir error: {e}")
