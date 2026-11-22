
import ctypes
x=ctypes.WinDLL("xpal.dll")
x.XpalGetXConfig.restype=ctypes.c_uint32
for slot in (0xCB,0x13B):
 out=(ctypes.c_ubyte*64)(); ret=ctypes.c_uint32()
 x.XpalGetXConfig(slot,out,64,ctypes.byref(ret))
 print(hex(slot),bytes(out[:ret.value]).hex(),"len",ret.value)
