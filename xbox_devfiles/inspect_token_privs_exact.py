import ctypes
from ctypes import wintypes
import struct

advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

GetCurrentProcess = kernel32.GetCurrentProcess
GetCurrentProcess.restype = wintypes.HANDLE

OpenProcessToken = advapi32.OpenProcessToken
OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
OpenProcessToken.restype = wintypes.BOOL

GetTokenInformation = advapi32.GetTokenInformation
GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
GetTokenInformation.restype = wintypes.BOOL

LookupPrivilegeNameW = advapi32.LookupPrivilegeNameW
LookupPrivilegeNameW.argtypes = [wintypes.LPCWSTR, ctypes.c_void_p, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
LookupPrivilegeNameW.restype = wintypes.BOOL

hToken = wintypes.HANDLE()
if OpenProcessToken(GetCurrentProcess(), 0x0008, ctypes.byref(hToken)):
    ret_len = wintypes.DWORD()
    GetTokenInformation(hToken, 3, None, 0, ctypes.byref(ret_len))
    buf = (ctypes.c_byte * ret_len.value)()
    GetTokenInformation(hToken, 3, buf, ret_len.value, ctypes.byref(ret_len))
    
    raw = bytes(buf)
    count = struct.unpack_from("<I", raw, 0)[0]
    print(f"Token contains {count} privileges:")
    offset = 4
    for i in range(count):
        low, high, attr = struct.unpack_from("<IIi", raw, offset)
        luid_buf = struct.pack("<II", low, high)
        name_buf = ctypes.create_unicode_buffer(256)
        name_len = wintypes.DWORD(256)
        LookupPrivilegeNameW(None, luid_buf, name_buf, ctypes.byref(name_len))
        print(f"  {name_buf.value} (LUID: 0x{high:X}:{low:08X}, Attr: 0x{attr:X})")
        offset += 12
    kernel32.CloseHandle(hToken)
