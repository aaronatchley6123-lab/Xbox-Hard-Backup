import winreg
import ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

# Read all XConfig registry values
reg_vals = {}
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig") as k:
    i = 0
    while True:
        try:
            name, data, typ = winreg.EnumValue(k, i)
            # Normalize to bytes
            if typ == winreg.REG_SZ:
                b = data.encode('ascii', errors='ignore') + b'\x00'
            elif typ == winreg.REG_DWORD:
                b = int(data).to_bytes(4, 'little')
            elif typ == winreg.REG_QWORD:
                b = int(data).to_bytes(8, 'little')
            elif typ == winreg.REG_BINARY:
                b = data
            else:
                b = bytes(data)
            reg_vals[name] = (b, typ, data)
            i += 1
        except OSError:
            break

buf = (ctypes.c_ubyte * 512)()
ret_bytes = wintypes.ULONG(0)

# Correlate
for slot in range(0x00, 0x140):
    status = XpalGetXConfig(slot, buf, 512, ctypes.byref(ret_bytes))
    if status == 0 and ret_bytes.value > 0:
        val = bytes(buf[:ret_bytes.value])
        matches = []
        for name, (b, typ, raw) in reg_vals.items():
            if b == val or (len(b) <= len(val) and val.startswith(b) and all(x == 0 for x in val[len(b):])):
                matches.append(name)
        match_str = ", ".join(matches[:3]) if matches else "[unknown / driver internal]"
        print(f"Slot 0x{slot:02X} ({slot:3d}) [{ret_bytes.value:2d}B] = {val.hex()} -> {match_str}")
