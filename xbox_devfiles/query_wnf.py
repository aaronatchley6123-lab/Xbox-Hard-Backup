import ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, POINTER, byref

ntdll = ctypes.windll.ntdll
RtlQueryWnfStateData = ntdll.RtlQueryWnfStateData
RtlQueryWnfStateData.argtypes = [POINTER(c_ulong * 2), c_void_p, c_void_p, POINTER(c_ulong), c_void_p, POINTER(c_ulong)]
RtlQueryWnfStateData.restype = c_long

# State Name 0x19890c35a3bd1875
# Low: 0xa3bd1875, High: 0x19890c35
state_name = (c_ulong * 2)(0xa3bd1875, 0x19890c35)
change_stamp = c_ulong(0)
buf = (ctypes.c_byte * 256)()
buf_size = c_ulong(256)

hr = RtlQueryWnfStateData(byref(state_name), None, None, byref(change_stamp), buf, byref(buf_size))
print(f"[*] Query WNF 0x19890c35a3bd1875: NTSTATUS={hex(hr & 0xffffffff)}, size={buf_size.value}")
if hr == 0 and buf_size.value > 0:
    raw = bytes(buf[:buf_size.value])
    print(f"  Data: {raw.hex()}")
