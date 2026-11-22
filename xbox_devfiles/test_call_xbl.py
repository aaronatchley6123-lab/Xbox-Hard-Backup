import ctypes

xbl = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\XboxLiveTitleId.dll")
fn = getattr(xbl, "GetSystemXboxLiveInfo")
fn.restype = ctypes.c_ulong

buf = ctypes.create_string_buffer(1024)
res = fn(buf, ctypes.c_ulong(1024))
print(f"GetSystemXboxLiveInfo result: {hex(res)}")
print("Buffer content:", repr(buf.raw[:100]))
