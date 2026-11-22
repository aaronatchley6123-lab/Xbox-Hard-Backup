import ctypes

hXpal = ctypes.windll.kernel32.LoadLibraryA(b"xpal.dll")
if not hXpal:
    print("[-] Failed to load xpal.dll")
    exit(1)

funcs = [
    ("XpalGetGenerationType", ctypes.c_int, []),
    ("XpalGetSystemType", ctypes.c_int, []),
    ("XpalIsHyperV", ctypes.c_uint8, []),
    ("XpalIsExternalDevkit", ctypes.c_uint8, []),
    ("XpalIsInternalDevkit", ctypes.c_uint8, []),
    ("XpalGetSouthBridgeType", ctypes.c_int, []),
    ("XpalGetSmcVersion", ctypes.c_uint32, []),
    ("XpalGetConsoleMode", ctypes.c_int, [])
]

for name, restype, argtypes in funcs:
    addr = ctypes.windll.kernel32.GetProcAddress(hXpal, name.encode())
    if addr:
        f = ctypes.WINFUNCTYPE(restype, *argtypes)(addr)
        try:
            val = f()
            print(f"  {name:25s} -> {val} (0x{val:08X})")
        except Exception as e:
            print(f"  {name:25s} -> Error: {e}")
    else:
        print(f"  {name:25s} -> Not exported")
