import ctypes, struct

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

slots_to_check = [
    (0x038, "DevkitFeatureFlags", 4),
    (0x06B, "EnableKernelDebugging", 4),
    (0x07E, "DevkitAllowACG", 1),
    (0x096, "HDMIInternalModesEnable", 4),
    (0x097, "LegacyGpuPerformanceMode", 4),
    (0x099, "DevKitHardware", 2),
    (0x0A9, "EraGraphicsDriverMode", 1),
    (0x0AB, "ConsoleMode", 1),
    (0x0AC, "PixFastTransportMode", 1),
    (0x0B9, "SraGraphicsDriverMode", 1),
    (0x0CB, "PrototypeMode", 4),
    (0x0EE, "TitlePerfOverlayEnable", 1),
    (0x0F4, "HostVmToolingCritical", 1),
    (0x0F6, "AllowIoDispatcherOverride", 1),
    (0x112, "ManufacturingTestMode", 4),
    (0x116, "EnableRGfx", 1),
    (0x125, "XvtoolFlags", 1),
    (0x13B, "PrototypeModeLiveSet", 4),
]

print("Current Status of Developer / Manufacturing Slots:")
for sid, name, expected_sz in slots_to_check:
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = fn_get(sid, buf, 64, ctypes.byref(ret))
    if res == 0:
        raw = bytes(buf[:ret.value])
        hex_val = raw.hex()
        if len(raw) == 1:
            val_str = f"{raw[0]} (0x{raw[0]:02x})"
        elif len(raw) == 2:
            val_str = f"{struct.unpack('<H', raw)[0]} (0x{struct.unpack('<H', raw)[0]:04x})"
        elif len(raw) == 4:
            val_str = f"{struct.unpack('<I', raw)[0]} (0x{struct.unpack('<I', raw)[0]:08x})"
        else:
            val_str = f"raw={hex_val}"
        print(f"Slot 0x{sid:03X} ({sid:3d}) [{name:<28}]: {val_str}")
    else:
        print(f"Slot 0x{sid:03X} ({sid:3d}) [{name:<28}]: err=0x{res:x}")
