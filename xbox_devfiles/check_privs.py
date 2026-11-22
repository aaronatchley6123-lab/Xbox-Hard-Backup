import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
advapi32.GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 64)]

h_token = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x20008, ctypes.byref(h_token)):
    ret_len = wintypes.DWORD(0)
    tp = TOKEN_PRIVILEGES()
    advapi32.GetTokenInformation(h_token, 3, ctypes.byref(tp), ctypes.sizeof(tp), ctypes.byref(ret_len))
    print(f"[*] Total privileges in token: {tp.PrivilegeCount}")
    for i in range(tp.PrivilegeCount):
        luid = tp.Privileges[i].Luid
        name_buf = ctypes.create_unicode_buffer(256)
        name_len = wintypes.DWORD(256)
        advapi32.LookupPrivilegeNameW(None, ctypes.byref(luid), name_buf, ctypes.byref(name_len))
        attr = tp.Privileges[i].Attributes
        enabled = bool(attr & 2)
        print(f"  [{'X' if enabled else ' '}] {name_buf.value} (attr={hex(attr)})")
    kernel32.CloseHandle(h_token)
