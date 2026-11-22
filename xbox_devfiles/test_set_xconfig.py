import ctypes
import struct

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

# Test slot 0x096 (HDMIInternalModesEnable)
slot = 0x096
buf = (ctypes.c_ubyte * 64)()
ret = ctypes.c_uint32(0)
res = fn_get(slot, buf, 64, ctypes.byref(ret))
print(f"Slot 0x096 initial read: res={res:#x}, size={ret.value}, hex={bytes(buf[:ret.value]).hex()}")

# Try setting to 1 (DWORD)
new_val = struct.pack("<I", 1)
in_buf = (ctypes.c_ubyte * len(new_val)).from_buffer_copy(new_val)
res_set = fn_set(slot, in_buf, len(new_val))
print(f"Slot 0x096 set(1): res={res_set:#x}")

# Read back
buf2 = (ctypes.c_ubyte * 64)()
ret2 = ctypes.c_uint32(0)
res2 = fn_get(slot, buf2, 64, ctypes.byref(ret2))
print(f"Slot 0x096 after set read: res={res2:#x}, size={ret2.value}, hex={bytes(buf2[:ret2.value]).hex()}")

