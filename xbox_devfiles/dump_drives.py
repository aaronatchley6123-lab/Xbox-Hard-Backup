import ctypes, os
from ctypes import wintypes

drives = []
bitmask = ctypes.windll.kernel32.GetLogicalDrives()
for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    if bitmask & 1:
        drives.append(letter + ':\\')
    bitmask >>= 1

print("=== Mounted Logical Drives ===")
for d in drives:
    dt = ctypes.windll.kernel32.GetDriveTypeW(d)
    dt_names = {0:'Unknown', 1:'NoRoot', 2:'Removable', 3:'Fixed', 4:'Remote', 5:'CDROM', 6:'RAMDisk'}
    
    vol_name = ctypes.create_unicode_buffer(260)
    fs_name = ctypes.create_unicode_buffer(260)
    serial = wintypes.DWORD(0)
    max_len = wintypes.DWORD(0)
    flags = wintypes.DWORD(0)
    
    ok = ctypes.windll.kernel32.GetVolumeInformationW(d, vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
    
    free_bytes = ctypes.c_ulonglong(0)
    total_bytes = ctypes.c_ulonglong(0)
    ctypes.windll.kernel32.GetDiskFreeSpaceExW(d, None, ctypes.byref(total_bytes), ctypes.byref(free_bytes))
    
    if ok:
        print(f"  {d:4s} [{vol_name.value:18s}] ({fs_name.value:5s}, {dt_names.get(dt, str(dt)):9s}): Total={total_bytes.value//(1024*1024):7d} MB, Free={free_bytes.value//(1024*1024):7d} MB")
    else:
        err = ctypes.windll.kernel32.GetLastError()
        print(f"  {d:4s} (Error {err})")

# Also check physical disk partitions or dos devices
print("\n=== QueryDosDevice Drive Targets ===")
target_buf = ctypes.create_unicode_buffer(1024)
for d in drives:
    drive_no_slash = d.rstrip('\\')
    res = ctypes.windll.kernel32.QueryDosDeviceW(drive_no_slash, target_buf, 1024)
    if res > 0:
        print(f"  {drive_no_slash} -> {target_buf.value}")

