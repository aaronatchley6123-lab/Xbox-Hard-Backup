import ctypes

xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")
fn = getattr(xpal, "XpalGetFactorySettings")
fn.restype = ctypes.c_void_p

ptr = fn()
print(f"XpalGetFactorySettings() pointer: {hex(ptr)}")

if ptr:
    raw = ctypes.string_at(ptr, 128)
    print("Factory Settings Raw Hex:")
    print(raw.hex())
    # Try reading as 32-bit uints
    uints = [int.from_bytes(raw[i:i+4], 'little') for i in range(0, 64, 4)]
    print("Factory Settings Uints:", [hex(u) for u in uints])
