import ctypes
from ctypes import wintypes

advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
GetNamedSecurityInfoW = advapi32.GetNamedSecurityInfoW
GetNamedSecurityInfoW.argtypes = [
    wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
    ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(ctypes.c_void_p),
    ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(ctypes.c_void_p),
    ctypes.POINTER(ctypes.c_void_p)
]
GetNamedSecurityInfoW.restype = wintypes.DWORD

ConvertSecurityDescriptorToStringSecurityDescriptorW = advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW
ConvertSecurityDescriptorToStringSecurityDescriptorW.argtypes = [
    ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD,
    ctypes.POINTER(wintypes.LPWSTR), ctypes.POINTER(wintypes.ULONG)
]
ConvertSecurityDescriptorToStringSecurityDescriptorW.restype = wintypes.BOOL

for p in ["C:\\", "D:\\", "D:\\Win11", "M:\\", "J:\\", "J:\\tools", "Q:\\", "S:\\", "X:\\", "Y:\\", "U:\\"]:
    pSecDesc = ctypes.c_void_p()
    pDacl = ctypes.c_void_p()
    err = GetNamedSecurityInfoW(p, 1, 1 | 4, None, None, ctypes.byref(pDacl), None, ctypes.byref(pSecDesc))
    if err != 0:
        print(f"{p:12s} -> ERR {err}")
    else:
        sddl = wintypes.LPWSTR()
        sddl_len = wintypes.ULONG()
        ConvertSecurityDescriptorToStringSecurityDescriptorW(pSecDesc, 1, 1 | 4, ctypes.byref(sddl), ctypes.byref(sddl_len))
        print(f"{p:12s} -> {sddl.value}")
