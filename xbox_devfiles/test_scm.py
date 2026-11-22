import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

OpenSCManagerW = advapi32.OpenSCManagerW
OpenSCManagerW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD]
OpenSCManagerW.restype = wintypes.HANDLE

for access in [0x0001, 0x0004, 0x0020, 0x0001 | 0x0004, 0xF003F]:
    h = OpenSCManagerW(None, None, access)
    err = kernel32.GetLastError() if not h else 0
    print(f"Access {hex(access)}: handle={hex(h or 0)}, err={err}")
