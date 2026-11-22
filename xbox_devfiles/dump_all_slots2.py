import ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")

XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

XpalSetXConfig = xpal.XpalSetXConfig
XpalSetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG]
XpalSetXConfig.restype = wintypes.LONG

buf = (ctypes.c_ubyte * 512)()
ret_bytes = wintypes.ULONG(0)

print("=== XCONFIG ACTIVE SLOTS ===")
for slot in range(0x00, 0x160):
    status = XpalGetXConfig(slot, buf, 512, ctypes.byref(ret_bytes))
    if status == 0 and ret_bytes.value > 0:
        val = bytes(buf[:ret_bytes.value])
        hex_str = " ".join(f"{b:02X}" for b in val[:16])
        if len(val) > 16: hex_str += " ..."
        ascii_str = "".join(chr(b) if 32 <= b < 127 else "." for b in val[:32])
        print(f"Slot 0x{slot:02X} ({slot:3d}): len={ret_bytes.value:2d} | HEX: {hex_str:35s} | ASCII: {ascii_str}")
