
import ctypes, struct
x=ctypes.WinDLL("xpal.dll")
x.XpalSetXConfig.restype=ctypes.c_uint32
x.XpalGetXConfig.restype=ctypes.c_uint32
b27=(ctypes.c_ubyte*4)(0,0,0,0)
b39=(ctypes.c_ubyte*1)(0)
print("SET27=",hex(x.XpalSetXConfig(0x27,b27,4)))
print("SET39=",hex(x.XpalSetXConfig(0x39,b39,1)))
out27=(ctypes.c_ubyte*64)(); ret27=ctypes.c_uint32()
out39=(ctypes.c_ubyte*64)(); ret39=ctypes.c_uint32()
x.XpalGetXConfig(0x27,out27,64,ctypes.byref(ret27)); x.XpalGetXConfig(0x39,out39,64,ctypes.byref(ret39))
print("GET27=",bytes(out27[:ret27.value]).hex(),"len",ret27.value)
print("GET39=",bytes(out39[:ret39.value]).hex(),"len",ret39.value)
