
import ctypes
from ctypes import wintypes, create_unicode_buffer

kernel32 = ctypes.windll.kernel32
kernel32.FindFirstVolumeW.restype = wintypes.HANDLE
kernel32.FindFirstVolumeW.argtypes = [wintypes.LPWSTR, wintypes.DWORD]
kernel32.FindNextVolumeW.restype = wintypes.BOOL
kernel32.FindNextVolumeW.argtypes = [wintypes.HANDLE, wintypes.LPWSTR, wintypes.DWORD]
kernel32.FindVolumeClose.restype = wintypes.BOOL
kernel32.FindVolumeClose.argtypes = [wintypes.HANDLE]

buf = create_unicode_buffer(260)
h = kernel32.FindFirstVolumeW(buf, 260)
if h != wintypes.HANDLE(-1).value:
    while True:
        vol = buf.value
        path_buf = create_unicode_buffer(260)
        ret_len = wintypes.DWORD()
        kernel32.GetVolumePathNamesForVolumeNameW(vol, path_buf, 260, ctypes.byref(ret_len))
        mounts = path_buf.value
        
        fs_buf = create_unicode_buffer(260)
        vol_label = create_unicode_buffer(260)
        ok = kernel32.GetVolumeInformationW(vol, vol_label, 260, None, None, None, fs_buf, 260)
        if ok:
            print(f'{vol} -> Mount: "{mounts}", Label: "{vol_label.value}", FS: {fs_buf.value}')
        else:
            print(f'{vol} -> Mount: "{mounts}" (no info)')
            
        if not kernel32.FindNextVolumeW(h, buf, 260):
            break
    kernel32.FindVolumeClose(h)
