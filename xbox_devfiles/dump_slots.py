import ctypes
import struct

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

print("Scanning XConfig slots 0x000 to 0x160...")
populated = {}
for sid in range(0x160):
    buf = (ctypes.c_ubyte * 1024)()
    ret = ctypes.c_uint32(0)
    res = fn_get(sid, buf, 1024, ctypes.byref(ret))
    if res == 0 and ret.value > 0:
        raw = bytes(buf[:ret.value])
        populated[sid] = raw

print(f"Total populated slots: {len(populated)}")
for sid, raw in sorted(populated.items()):
    h = raw.hex()
    ascii_repr = "".join([chr(b) if 32 <= b <= 126 else "." for b in raw])
    if len(raw) == 1:
        val = f"u8={raw[0]} (0x{raw[0]:02x})"
    elif len(raw) == 2:
        val = f"u16={struct.unpack('<H', raw)[0]} (0x{struct.unpack('<H', raw)[0]:04x})"
    elif len(raw) == 4:
        val = f"u32={struct.unpack('<I', raw)[0]} (0x{struct.unpack('<I', raw)[0]:08x})"
    else:
        val = f"len={len(raw)}"
    print(f"Slot 0x{sid:03X} ({sid:3d}): {val:<20} | Hex: {h:<16} | '{ascii_repr}'")

