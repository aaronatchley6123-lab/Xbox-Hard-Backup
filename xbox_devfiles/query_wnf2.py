import ctypes
from ctypes import c_ulong, c_ulonglong, c_long, c_void_p, POINTER, byref

ntdll = ctypes.windll.ntdll
RtlQueryWnfStateData = ntdll.RtlQueryWnfStateData
RtlQueryWnfStateData.argtypes = [POINTER(c_ulonglong), c_void_p, c_void_p, POINTER(c_ulong), c_void_p, POINTER(c_ulong)]
RtlQueryWnfStateData.restype = c_long

state = c_ulonglong(0x19890c35a3bd1875)
stamp = c_ulong(0)
buf = (ctypes.c_byte * 256)()
size = c_ulong(256)

hr = RtlQueryWnfStateData(byref(state), None, None, byref(stamp), buf, byref(size))
print(f"[*] Query WNF (ulonglong): NTSTATUS={hex(hr & 0xffffffff)}, size={size.value}")
