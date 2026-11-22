import ctypes, string
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
GetLogicalDrives = kernel32.GetLogicalDrives
GetDriveTypeW = kernel32.GetDriveTypeW
GetVolumeInformationW = kernel32.GetVolumeInformationW

drive_types = {
    0: "UNKNOWN",
    1: "NO_ROOT_DIR",
    2: "REMOVABLE",
    3: "FIXED",
    4: "REMOTE",
    5: "CDROM",
    6: "RAMDISK"
}

bitmask = GetLogicalDrives()
print(f"[*] Logical drive bitmask: {bin(bitmask)}")

for i in range(26):
    if bitmask & (1 << i):
        letter = chr(ord('A') + i)
        path = f"{letter}:\\"
        dtype = GetDriveTypeW(ctypes.c_wchar_p(path))
        tname = drive_types.get(dtype, "OTHER")
        
        vol_name = ctypes.create_unicode_buffer(260)
        fs_name = ctypes.create_unicode_buffer(260)
        serial = wintypes.DWORD()
        max_len = wintypes.DWORD()
        flags = wintypes.DWORD()
        
        ok = GetVolumeInformationW(ctypes.c_wchar_p(path), vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
        if ok:
            print(f"  Drive {path}: Type={tname} ({dtype}), Label='{vol_name.value}', FS='{fs_name.value}'")
        else:
            err = kernel32.GetLastError()
            print(f"  Drive {path}: Type={tname} ({dtype}), GetVolumeInformation failed (err={err})")
