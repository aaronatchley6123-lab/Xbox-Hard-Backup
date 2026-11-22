import ctypes, struct

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

zero_slots = []
for sid in range(0x140):
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = fn_get(sid, buf, 64, ctypes.byref(ret))
    if res == 0 and ret.value in (1, 2, 4):
        raw = bytes(buf[:ret.value])
        val = int.from_bytes(raw, 'little')
        zero_slots.append((sid, ret.value, val))

print(f"Total scalar slots scanned: {len(zero_slots)}")
zero_only = [s for s in zero_slots if s[2] == 0]
print(f"Zeroed scalar slots: {len(zero_only)}")
for sid, sz, val in zero_only:
    print(f"Slot 0x{sid:03X} ({sid:3d}) [sz={sz}]: val=0")
