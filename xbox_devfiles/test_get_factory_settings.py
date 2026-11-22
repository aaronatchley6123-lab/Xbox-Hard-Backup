import ctypes

xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")
fn = getattr(xpal, "XpalGetFactorySettings", None)
if fn:
    buf = ctypes.create_string_buffer(256)
    size = ctypes.c_ulong(256)
    try:
        res = fn(buf, ctypes.byref(size))
        print(f"XpalGetFactorySettings result: {hex(res)}, size: {size.value}")
        print("Data raw:", buf.raw[:size.value].hex())
    except Exception as e:
        print("Call with byref failed:", e)
        try:
            res = fn(buf)
            print(f"XpalGetFactorySettings(buf) result: {hex(res)}")
            print("Data raw:", buf.raw[:64].hex())
        except Exception as e2:
            print("Call with buf failed:", e2)
else:
    print("XpalGetFactorySettings not found")

