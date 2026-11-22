import ctypes

xpal = ctypes.WinDLL("xpal.dll")
fn = xpal.XpalIsFactorySettingEnabled
fn.restype = ctypes.c_uint32
for i in range(10):
    val = fn(i)
    print(f"XpalIsFactorySettingEnabled({i}) = {val} (0x{val:08X})")

