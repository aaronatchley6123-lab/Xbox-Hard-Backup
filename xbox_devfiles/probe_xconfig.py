import ctypes

xpal = ctypes.WinDLL("xpal.dll")
print("[*] Probing XpalGetXConfig and XpalSetXConfig...")

# XpalGetXConfig / XpalSetXConfig signatures:
# XpalGetXConfig(DWORD SettingId, void *Buffer, DWORD Size, DWORD *BytesReturned)
if hasattr(xpal, "XpalGetXConfig"):
    fn_get = xpal.XpalGetXConfig
    fn_get.restype = ctypes.c_uint32
    
    # Sweep standard XConfig setting IDs (0 to 64)
    active_configs = []
    for setting_id in range(64):
        buf = (ctypes.c_ubyte * 64)()
        bytes_ret = ctypes.c_uint32(0)
        try:
            res = fn_get(setting_id, buf, 64, ctypes.byref(bytes_ret))
            if res == 0 and bytes_ret.value > 0:
                raw_bytes = bytes(buf[:bytes_ret.value])
                active_configs.append((setting_id, raw_bytes.hex(), bytes_ret.value))
        except Exception:
            pass

    print(f"[+] Found {len(active_configs)} readable XConfig settings:")
    for c in active_configs:
        print(f"    Setting ID {c[0]:#04x}: {c[1]} (len: {c[2]})")

