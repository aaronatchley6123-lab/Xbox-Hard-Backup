import ctypes, string
from ctypes import wintypes

k32 = ctypes.windll.kernel32
mask = k32.GetLogicalDrives()
drives = [string.ascii_uppercase[i] for i in range(26) if (mask >> i) & 1]

for d in drives:
    dev_buf = ctypes.create_unicode_buffer(512)
    k32.QueryDosDeviceW(f"{d}:", dev_buf, 512)
    vol_name = ctypes.create_unicode_buffer(256)
    fs_name = ctypes.create_unicode_buffer(256)
    serial = wintypes.DWORD(0)
    max_comp = wintypes.DWORD(0)
    flags = wintypes.DWORD(0)
    ok = k32.GetVolumeInformationW(f"{d}:\\", vol_name, 256, ctypes.byref(serial), ctypes.byref(max_comp), ctypes.byref(flags), fs_name, 256)
    dtype = k32.GetDriveTypeW(f"{d}:\\")
    print(f"{d}: type={dtype} dev={dev_buf.value} vol={vol_name.value!r} fs={fs_name.value!r} (ok={ok})")
