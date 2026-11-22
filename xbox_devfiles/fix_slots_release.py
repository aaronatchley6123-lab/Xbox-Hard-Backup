import ctypes
import struct

xpal = ctypes.WinDLL("xpal.dll")
xpal.XpalSetXConfig.restype = ctypes.c_uint32

buf_27 = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", 0))
buf_39 = (ctypes.c_ubyte * 1)(0)

r27 = xpal.XpalSetXConfig(0x27, buf_27, 4)
r39 = xpal.XpalSetXConfig(0x39, buf_39, 1)

print(f"[+] Released NVRAM Slot 0x27 -> 0: res=0x{r27:08X}")
print(f"[+] Released NVRAM Slot 0x39 -> 0: res=0x{r39:08X}")

ret = ctypes.c_uint32(0)
buf = (ctypes.c_ubyte * 64)()
xpal.XpalGetXConfig(0x27, buf, 64, ctypes.byref(ret))
print(f"[+] Verified Slot 0x27: {list(buf[:4])}")
xpal.XpalGetXConfig(0x39, buf, 64, ctypes.byref(ret))
print(f"[+] Verified Slot 0x39: {buf[0]}")
