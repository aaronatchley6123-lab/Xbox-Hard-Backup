import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GetLogicalDriveStringsW = kernel32.GetLogicalDriveStringsW
GetLogicalDriveStringsW.argtypes = [wintypes.DWORD, wintypes.LPWSTR]
GetLogicalDriveStringsW.restype = wintypes.DWORD

GetVolumeInformationW = kernel32.GetVolumeInformationW
GetVolumeInformationW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
    wintypes.LPDWORD, wintypes.LPDWORD, wintypes.LPDWORD,
    wintypes.LPWSTR, wintypes.DWORD
]
GetVolumeInformationW.restype = wintypes.BOOL

QueryDosDeviceW = kernel32.QueryDosDeviceW
QueryDosDeviceW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
QueryDosDeviceW.restype = wintypes.DWORD

# Enumerate drive letters
buf = ctypes.create_unicode_buffer(512)
GetLogicalDriveStringsW(512, buf)
drives = [d for d in buf[:].split('\0') if d]

print("=== Mapped Logical Drives ===")
for d in drives:
    vol_name = ctypes.create_unicode_buffer(260)
    fs_name = ctypes.create_unicode_buffer(260)
    serial = wintypes.DWORD()
    max_len = wintypes.DWORD()
    flags = wintypes.DWORD()
    
    dev_buf = ctypes.create_unicode_buffer(512)
    QueryDosDeviceW(d[:2], dev_buf, 512)
    device_target = dev_buf.value
    
    ok = GetVolumeInformationW(d, vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
    if ok:
        print(f"Drive {d[:2]} -> {device_target} | Label: '{vol_name.value}' | FS: {fs_name.value}")
    else:
        err = ctypes.get_last_error()
        print(f"Drive {d[:2]} -> {device_target} | Error: {err}")

print("\n=== Direct Probing of HarddiskVolumes 1..20 ===")
for i in range(1, 25):
    vol_path = f"\\\\?\\GLOBALROOT\\Device\\HarddiskVolume{i}\\"
    vol_name = ctypes.create_unicode_buffer(260)
    fs_name = ctypes.create_unicode_buffer(260)
    serial = wintypes.DWORD()
    max_len = wintypes.DWORD()
    flags = wintypes.DWORD()
    ok = GetVolumeInformationW(vol_path, vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
    if ok:
        print(f"HarddiskVolume{i}: Label='{vol_name.value}', FS={fs_name.value}")
    else:
        err = ctypes.get_last_error()
        if err != 2 and err != 3: # not file not found
            print(f"HarddiskVolume{i}: Access / Status Code = {err}")
