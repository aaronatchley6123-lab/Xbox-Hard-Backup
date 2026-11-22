import ctypes
from ctypes import wintypes

advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 64)]

GetCurrentProcess = kernel32.GetCurrentProcess
GetCurrentProcess.restype = wintypes.HANDLE

OpenProcessToken = advapi32.OpenProcessToken
OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
OpenProcessToken.restype = wintypes.BOOL

LookupPrivilegeValueW = advapi32.LookupPrivilegeValueW
LookupPrivilegeValueW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, ctypes.POINTER(LUID)]
LookupPrivilegeValueW.restype = wintypes.BOOL

AdjustTokenPrivileges = advapi32.AdjustTokenPrivileges
AdjustTokenPrivileges.argtypes = [wintypes.HANDLE, wintypes.BOOL, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p, ctypes.c_void_p]
AdjustTokenPrivileges.restype = wintypes.BOOL

GetTokenInformation = advapi32.GetTokenInformation
GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
GetTokenInformation.restype = wintypes.BOOL

hToken = wintypes.HANDLE()
if not OpenProcessToken(GetCurrentProcess(), 0x0020 | 0x0008, ctypes.byref(hToken)):
    print("OpenProcessToken failed:", ctypes.get_last_error())
else:
    print(f"Token opened successfully! Handle: 0x{hToken.value:X}")
    
    # Query all privileges in token
    ret_len = wintypes.DWORD()
    GetTokenInformation(hToken, 3, None, 0, ctypes.byref(ret_len))
    buf = (ctypes.c_byte * ret_len.value)()
    if GetTokenInformation(hToken, 3, buf, ret_len.value, ctypes.byref(ret_len)):
        tp = TOKEN_PRIVILEGES.from_buffer(buf)
        print(f"Token contains {tp.PrivilegeCount} privileges:")
        
        LookupPrivilegeNameW = advapi32.LookupPrivilegeNameW
        LookupPrivilegeNameW.argtypes = [wintypes.LPCWSTR, ctypes.POINTER(LUID), wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
        LookupPrivilegeNameW.restype = wintypes.BOOL
        
        for i in range(tp.PrivilegeCount):
            item = tp.Privileges[i]
            name_buf = ctypes.create_unicode_buffer(256)
            name_len = wintypes.DWORD(256)
            LookupPrivilegeNameW(None, ctypes.byref(item.Luid), name_buf, ctypes.byref(name_len))
            enabled = bool(item.Attributes & 0x00000002)
            default_enabled = bool(item.Attributes & 0x00000001)
            print(f"  {name_buf.value}: Enabled={enabled}, Default={default_enabled}, Attr=0x{item.Attributes:X}")
    kernel32.CloseHandle(hToken)
