import ctypes
from ctypes import wintypes

dsreg = ctypes.WinDLL("dsreg.dll")
fn = getattr(dsreg, "DsrGetJoinInfo", None)
if fn:
    fn.argtypes = [wintypes.LPCWSTR, ctypes.POINTER(ctypes.c_void_p)]
    fn.restype = ctypes.c_long
    
    pJoinInfo = ctypes.c_void_p()
    hr = fn(None, ctypes.byref(pJoinInfo))
    print(f"DsrGetJoinInfo(None): hr=0x{hr & 0xFFFFFFFF:08X}, ptr=0x{(pJoinInfo.value or 0):X}")
    
    # Try with current user
    hr2 = fn(r"<REDACTED_EMAIL>", ctypes.byref(pJoinInfo))
    print(f"DsrGetJoinInfo(user): hr=0x{hr2 & 0xFFFFFFFF:08X}, ptr=0x{(pJoinInfo.value or 0):X}")

