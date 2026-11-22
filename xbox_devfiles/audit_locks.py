import ctypes

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

slots = [0x27, 0x39, 0x112, 0xAB]
for slot in slots:
    buf = (ctypes.c_ubyte * 16)()
    ret = ctypes.c_uint32(0)
    try:
        res = fn_get(slot, buf, 16, ctypes.byref(ret))
        val = list(buf[:ret.value])
        print(f"Slot {hex(slot)}: res=0x{res:x}, ret={ret.value}, data={val}")
    except Exception as e:
        print(f"Slot {hex(slot)} error: {e}")

# Check holding partition
k32 = ctypes.windll.kernel32
h = k32.CreateFileW(r"\\.\xvmctrl", 0xC0000000, 3, None, 3, 0x80, None)
if h != -1:
    in_buf = ctypes.create_string_buffer(512)
    out_buf = ctypes.create_string_buffer(512)
    ret_b = ctypes.c_ulong(0)
    ok = k32.DeviceIoControl(h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret_b), None)
    print(f"Holding Partition IOCTL query: ok={ok}, ret_bytes={ret_b.value}")
    k32.CloseHandle(h)
