
import ctypes, struct
xpal = ctypes.WinDLL("xpal.dll")
for slot in [0x01, 0x27, 0x38, 0x39, 0x7D, 0xAB, 0x0D3, 0x112]:
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = xpal.XpalGetXConfig(slot, buf, 64, ctypes.byref(ret))
    hex_val = bytes(buf[:ret.value]).hex() if ret.value > 0 else "<none>"
    print(f"Slot 0x{slot:02X}: res={res:#x} retLen={ret.value} val={hex_val}")
