
import ctypes
x=ctypes.WinDLL("xpal.dll")
x.XpalSetXConfig.restype=ctypes.c_uint32
x.XpalGetXConfig.restype=ctypes.c_uint32
buf=(ctypes.c_ubyte*1)(0xC8)
print("SET0xAB=",hex(x.XpalSetXConfig(0xAB,buf,1)))
out=(ctypes.c_ubyte*64)(); ret=ctypes.c_uint32()
x.XpalGetXConfig(0xAB,out,64,ctypes.byref(ret))
print("GET0xAB=",bytes(out[:ret.value]).hex(),"len",ret.value)
