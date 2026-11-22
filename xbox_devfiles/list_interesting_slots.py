import winreg, ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

buf = (ctypes.c_ubyte * 512)()
ret_bytes = wintypes.ULONG(0)

slots = []
for s in range(0x00, 0x160):
    status = XpalGetXConfig(s, buf, 512, ctypes.byref(ret_bytes))
    if status == 0 and ret_bytes.value > 0:
        val = bytes(buf[:ret_bytes.value])
        # Only show non-zero or meaningful slots
        if any(b != 0 for b in val):
            slots.append((s, ret_bytes.value, val))

for s, l, v in slots:
    val_int = int.from_bytes(v, 'little') if l <= 8 else None
    val_str = ""
    try:
        val_str = v.decode('ascii', errors='ignore').rstrip('\x00')
    except:
        pass
    int_str = f"int={val_int} (0x{val_int:X})" if val_int is not None else ""
    str_disp = f"str='{val_str}'" if val_str and any(c.isalnum() for c in val_str) else ""
    raw_hex = " ".join(f"{b:02X}" for b in v[:12])
    print(f"Slot 0x{s:02X} ({s:3d}): len={l:2d} | {raw_hex:26s} | {int_str:25s} | {str_disp}")
