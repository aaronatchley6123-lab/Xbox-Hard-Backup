import ctypes
from ctypes import wintypes
import struct

advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

kernel32.GetCurrentProcess.restype = wintypes.HANDLE
advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
advapi32.OpenProcessToken.restype = wintypes.BOOL
advapi32.GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
advapi32.GetTokenInformation.restype = wintypes.BOOL
advapi32.ConvertSidToStringSidW.argtypes = [ctypes.c_void_p, ctypes.POINTER(wintypes.LPWSTR)]
advapi32.ConvertSidToStringSidW.restype = wintypes.BOOL
advapi32.LookupAccountSidW.argtypes = [wintypes.LPCWSTR, ctypes.c_void_p, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD), wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD), ctypes.POINTER(wintypes.DWORD)]
advapi32.LookupAccountSidW.restype = wintypes.BOOL

def sid_info(sid_ptr):
    s_sid = wintypes.LPWSTR()
    advapi32.ConvertSidToStringSidW(sid_ptr, ctypes.byref(s_sid))
    name = ctypes.create_unicode_buffer(256); n_len = wintypes.DWORD(256)
    domain = ctypes.create_unicode_buffer(256); d_len = wintypes.DWORD(256)
    s_use = wintypes.DWORD()
    ok = advapi32.LookupAccountSidW(None, sid_ptr, name, ctypes.byref(n_len), domain, ctypes.byref(d_len), ctypes.byref(s_use))
    lbl = f"{domain.value}\\{name.value}" if ok else "<unknown>"
    return f"{lbl} ({s_sid.value})"

hToken = wintypes.HANDLE()
if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0008, ctypes.byref(hToken)):
    print("OpenProcessToken failed:", ctypes.get_last_error())
else:
    # TokenUser = 1
    rl = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, 1, None, 0, ctypes.byref(rl))
    buf = (ctypes.c_byte * rl.value)()
    advapi32.GetTokenInformation(hToken, 1, buf, rl.value, ctypes.byref(rl))
    sid_ptr, _ = struct.unpack_from("<QQ", bytes(buf), 0)
    print("TokenUser:", sid_info(sid_ptr))

    # TokenOwner = 4
    rl = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, 4, None, 0, ctypes.byref(rl))
    buf = (ctypes.c_byte * rl.value)()
    advapi32.GetTokenInformation(hToken, 4, buf, rl.value, ctypes.byref(rl))
    sid_ptr = struct.unpack_from("<Q", bytes(buf), 0)[0]
    print("TokenOwner:", sid_info(sid_ptr))

    # TokenElevationType = 18
    et = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, 18, ctypes.byref(et), 4, ctypes.byref(rl))
    print("TokenElevationType:", et.value, "(1=Default, 2=Full, 3=Limited)")

    # TokenGroups = 2
    rl = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, 2, None, 0, ctypes.byref(rl))
    buf = (ctypes.c_byte * rl.value)()
    advapi32.GetTokenInformation(hToken, 2, buf, rl.value, ctypes.byref(rl))
    count = struct.unpack_from("<I", bytes(buf), 0)[0]
    print(f"TokenGroups ({count}):")
    off = 8
    for i in range(count):
        sid_ptr, attr = struct.unpack_from("<QQ", bytes(buf), off)
        print(f"  [{i}] {sid_info(sid_ptr)}  attr=0x{attr:X}")
        off += 16
    kernel32.CloseHandle(hToken)
