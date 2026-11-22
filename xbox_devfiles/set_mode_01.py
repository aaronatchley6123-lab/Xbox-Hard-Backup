import ctypes
from ctypes import wintypes

xpal = ctypes.WinDLL(r"C:\Windows\System32\xpal.dll")

xpal.XpalSetXConfig.argtypes = [wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD]
xpal.XpalSetXConfig.restype = wintypes.DWORD

buf = (ctypes.c_ubyte * 1)(0x01)
hr = xpal.XpalSetXConfig(0xAB, buf, 1)
print(f"XpalSetXConfig(0xAB, [0x01], 1) returned: 0x{hr:08X}")

cbRet = ctypes.c_uint32(0)
buf_out = (ctypes.c_ubyte * 64)()
xpal.XpalGetXConfig(0xAB, buf_out, 64, ctypes.byref(cbRet))
print(f"Verified Slot 0xAB now: {[hex(b) for b in buf_out[:cbRet.value]]}")
