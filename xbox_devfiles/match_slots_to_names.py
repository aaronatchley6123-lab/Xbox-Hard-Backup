import winreg, ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

reg_map = {}
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig") as xcfg:
    i = 0
    while True:
        try:
            sk_name = winreg.EnumKey(xcfg, i)
            i += 1
            try:
                with winreg.OpenKey(xcfg, sk_name) as sk:
                    data, typ = winreg.QueryValueEx(sk, "Version1")
                    if typ == winreg.REG_DWORD:
                        b = int(data).to_bytes(4, 'little')
                    elif typ == winreg.REG_BINARY:
                        b = bytes(data)
                    elif typ == winreg.REG_SZ:
                        b = data.encode('ascii', errors='ignore')
                    elif typ == winreg.REG_QWORD:
                        b = int(data).to_bytes(8, 'little')
                    else:
                        b = bytes(data)
                    reg_map[sk_name] = b
            except Exception:
                pass
        except OSError:
            break

buf = (ctypes.c_ubyte * 512)()
ret_bytes = wintypes.ULONG(0)

# Known exact matches
exact = {}
for slot in range(0x00, 0x140):
    status = XpalGetXConfig(slot, buf, 512, ctypes.byref(ret_bytes))
    if status == 0 and ret_bytes.value > 0:
        val = bytes(buf[:ret_bytes.value])
        for name, b in reg_map.items():
            if b == val:
                exact.setdefault(slot, []).append(name)
            elif len(b) > 0 and len(b) <= len(val) and val.startswith(b) and all(x == 0 for x in val[len(b):]):
                exact.setdefault(slot, []).append(f"{name}*")

# Filter unique / best
print("=== XCONFIG SLOTS MAPPED TO REGISTRY KEYS ===")
for slot, names in sorted(exact.items()):
    # if too many generic matches like 00 or 01, show first 4
    n_str = ", ".join(names[:4])
    print(f"Slot 0x{slot:02X} ({slot:3d}) -> {n_str}")
