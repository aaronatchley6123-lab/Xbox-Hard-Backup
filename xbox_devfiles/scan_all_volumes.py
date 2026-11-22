import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.windll.kernel32

print("Auditing HarddiskVolume1 through 19:")
for i in range(1, 20):
    vol_path = rf"\\?\GLOBALROOT\Device\HarddiskVolume{i}\\"
    vol_name = ctypes.create_unicode_buffer(256)
    fs_name = ctypes.create_unicode_buffer(256)
    serial = wintypes.DWORD(0)
    max_len = wintypes.DWORD(0)
    flags = wintypes.DWORD(0)
    
    ok = kernel32.GetVolumeInformationW(
        vol_path, vol_name, 256, ctypes.byref(serial),
        ctypes.byref(max_len), ctypes.byref(flags), fs_name, 256
    )
    if ok:
        print(f"  Volume{i:2d}: Label='{vol_name.value}' FS='{fs_name.value}'")
    else:
        err = kernel32.GetLastError()
        print(f"  Volume{i:2d}: GetVolumeInformation error {err}")
