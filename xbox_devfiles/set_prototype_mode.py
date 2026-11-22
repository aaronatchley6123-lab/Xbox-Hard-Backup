
import ctypes
x=ctypes.WinDLL("xpal.dll")
x.XpalGetXConfig.restype=ctypes.c_uint32
x.XpalSetXConfig.restype=ctypes.c_uint32
slots=[0xCB,0x13B]
for slot in slots:
 out=(ctypes.c_ubyte*64)(); ret=ctypes.c_uint32()
 x.XpalGetXConfig(slot,out,64,ctypes.byref(ret))
 print("BEFORE",hex(slot),bytes(out[:ret.value]).hex(),"len",ret.value)
 buf=(ctypes.c_ubyte*4)(1,0,0,0)
 print("SET",hex(slot),hex(x.XpalSetXConfig(slot,buf,4)))
 out=(ctypes.c_ubyte*64)(); ret=ctypes.c_uint32()
 x.XpalGetXConfig(slot,out,64,ctypes.byref(ret))
 print("AFTER",hex(slot),bytes(out[:ret.value]).hex(),"len",ret.value)
