
import ctypes
xpal = ctypes.WinDLL("xpal.dll")
for name in ["XpalInitialize", "XpalGetConsoleMode", "XpalGetVmType", "XpalGetCapabilities"]:
    try:
        fn = getattr(xpal, name)
        fn.restype = ctypes.c_uint32
        print(name, "->", hex(fn()))
    except Exception as e:
        print(name, "EXC:", e)
