
import ctypes, struct
xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
slots = [56, 107, 126, 150, 151, 153, 169, 171, 185, 203, 274, 315]
for s in slots:
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = fn_get(s, buf, 64, ctypes.byref(ret))
    if res == 0:
        raw = bytes(buf[:ret.value])
        print(f"Slot 0x{s:03X} ({s:3d}): raw={raw.hex()}")
    else:
        print(f"Slot 0x{s:03X} ({s:3d}): err=0x{res:x}")
