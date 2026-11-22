import ctypes
from ctypes import wintypes

dsreg = ctypes.WinDLL("dsreg.dll")
fn = getattr(dsreg, "DsrGetPrtAuthorityInfo", None)
if fn:
    fn.argtypes = [wintypes.DWORD, ctypes.POINTER(ctypes.c_void_p)]
    fn.restype = ctypes.c_long
    
    pInfo = ctypes.c_void_p()
    for flag in [0, 1, 2]:
        hr = fn(flag, ctypes.byref(pInfo))
        print(f"DsrGetPrtAuthorityInfo({flag}): hr=0x{hr & 0xFFFFFFFF:08X}, ptr=0x{(pInfo.value or 0):X}")
        if hr == 0 and pInfo.value:
            raw = ctypes.string_at(pInfo.value, 56)
            print("  Raw struct bytes:", raw.hex())
else:
    print("DsrGetPrtAuthorityInfo not found in dsreg.dll")

# Also check DsrIsDeviceJoined and DsrGetJoinInfo
fn_joined = getattr(dsreg, "DsrIsDeviceJoined", None)
if fn_joined:
    fn_joined.argtypes = [ctypes.POINTER(wintypes.BOOL)]
    fn_joined.restype = ctypes.c_long
    is_joined = wintypes.BOOL()
    hr = fn_joined(ctypes.byref(is_joined))
    print(f"DsrIsDeviceJoined: hr=0x{hr & 0xFFFFFFFF:08X}, is_joined={is_joined.value}")

