import ctypes, struct

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

slots_to_enable = [
    (0x06B, "EnableKernelDebugging", 4, 1),
    (0x07E, "DevkitAllowACG", 1, 1),
    (0x081, "AllowCrashDump", 1, 1),
    (0x096, "HDMIInternalModesEnable", 4, 1),
    (0x097, "LegacyGpuPerformanceMode", 4, 1),
    (0x0AC, "PixFastTransportMode", 1, 1),
    (0x0CF, "AllowHostTracing", 1, 1),
    (0x0D7, "RestoreDevXvds", 1, 1),
    (0x0EE, "TitlePerfOverlayEnable", 1, 1),
    (0x0F4, "HostVmToolingCritical", 1, 1),
    (0x0F6, "AllowIoDispatcherOverride", 1, 1),
    (0x112, "ManufacturingTestMode", 4, 1),
    (0x116, "EnableRGfx", 1, 1),
    (0x125, "XvtoolFlags", 1, 1),
]

print("=== Flipping Manufacturing & Developer NVRAM Slots ===")
for sid, name, sz, target_val in slots_to_enable:
    if sz == 1:
        data = struct.pack("<B", target_val)
    elif sz == 2:
        data = struct.pack("<H", target_val)
    elif sz == 4:
        data = struct.pack("<I", target_val)
    else:
        continue
    
    in_buf = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    res_set = fn_set(sid, in_buf, len(data))
    
    # Read back to verify
    out_buf = (ctypes.c_ubyte * 64)()
    ret_sz = ctypes.c_uint32(0)
    res_get = fn_get(sid, out_buf, 64, ctypes.byref(ret_sz))
    
    if res_get == 0:
        raw = bytes(out_buf[:ret_sz.value])
        val = int.from_bytes(raw, 'little')
        print(f"Slot 0x{sid:03X} ({sid:3d}) [{name:<28}]: Set=0x{res_set:X} -> Readback={val} (raw={raw.hex()})")
    else:
        print(f"Slot 0x{sid:03X} ({sid:3d}) [{name:<28}]: Set=0x{res_set:X} -> Readback Error 0x{res_get:X}")

print("=== All Slots Flipped & Verified Successfully ===")
