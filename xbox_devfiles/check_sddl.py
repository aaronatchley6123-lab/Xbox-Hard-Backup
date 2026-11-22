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

def print_sddl(path):
    pSecDesc = ctypes.c_void_p()
    pDacl = ctypes.c_void_p()
    # SE_FILE_OBJECT = 1, DACL_SECURITY_INFORMATION = 4, OWNER_SECURITY_INFORMATION = 1
    err = GetNamedSecurityInfoW(path, 1, 1 | 4, None, None, ctypes.byref(pDacl), None, ctypes.byref(pSecDesc))
    if err != 0:
        print(f"{path}: GetNamedSecurityInfo failed with error {err}")
        return
    
    sddl = wintypes.LPWSTR()
    sddl_len = wintypes.ULONG()
    if ConvertSecurityDescriptorToStringSecurityDescriptorW(pSecDesc, 1, 1 | 4, ctypes.byref(sddl), ctypes.byref(sddl_len)):
        print(f"{path} SDDL:\n  {sddl.value}")
    else:
        print(f"{path}: Convert failed {ctypes.get_last_error()}")

print_sddl("C:\\")
print_sddl("M:\\")
print_sddl("S:\\")
print_sddl("D:\\")
