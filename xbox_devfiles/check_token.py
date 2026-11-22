import ctypes
from ctypes import wintypes
import struct

advapi32 = ctypes.WinDLL("advapi32")
kernel32 = ctypes.WinDLL("kernel32")

ConvertSidToStringSidW = advapi32.ConvertSidToStringSidW
ConvertSidToStringSidW.argtypes = [ctypes.c_void_p, ctypes.POINTER(wintypes.LPWSTR)]
ConvertSidToStringSidW.restype = wintypes.BOOL

LookupAccountSidW = advapi32.LookupAccountSidW
LookupAccountSidW.argtypes = [wintypes.LPCWSTR, ctypes.c_void_p, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD), wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD)]
LookupAccountSidW.restype = wintypes.BOOL

hToken = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0008, ctypes.byref(hToken)):
    # TokenUser = 1
    ret_len = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, 1, None, 0, ctypes.byref(ret_len))
    buf = (ctypes.c_byte * ret_len.value)()
    advapi32.GetTokenInformation(hToken, 1, buf, ret_len.value, ctypes.byref(ret_len))
    sid_ptr, attr = struct.unpack_from("<QQ", bytes(buf), 0)
    s_sid = wintypes.LPWSTR()
    ConvertSidToStringSidW(sid_ptr, ctypes.byref(s_sid))
    name = ctypes.create_unicode_buffer(256); n_len = wintypes.DWORD(256)
    domain = ctypes.create_unicode_buffer(256); d_len = wintypes.DWORD(256)
    s_use = wintypes.DWORD()
    LookupAccountSidW(None, sid_ptr, name, ctypes.byref(n_len), domain, ctypes.byref(d_len), ctypes.byref(s_use))
    print(f"Current User: {domain.value}\\{name.value} ({s_sid.value})")
    kernel32.CloseHandle(hToken)
