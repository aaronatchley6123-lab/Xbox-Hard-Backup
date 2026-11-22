import sys, ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, POINTER, byref

ole32 = ctypes.windll.ole32
CoInitializeEx = ole32.CoInitializeEx
CoInitializeEx.argtypes = [c_void_p, c_ulong]
CoInitializeEx.restype = c_long

CoCreateInstance = ole32.CoCreateInstance
CoCreateInstance.argtypes = [c_void_p, c_void_p, c_ulong, c_void_p, POINTER(c_void_p)]
CoCreateInstance.restype = c_long

class GUID(ctypes.Structure):
    _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]

def make_guid(d1, d2, d3, b_list):
    g = GUID()
    g.Data1 = d1; g.Data2 = d2; g.Data3 = d3
    for i, b in enumerate(b_list): g.Data4[i] = b
    return g

# CLSID: {50e9199e-5414-4ffe-a0cf-b65fa9f43d5e}
CLSID_Manufacturing = make_guid(0x50e9199e, 0x5414, 0x4ffe, [0xa0, 0xcf, 0xb6, 0x5f, 0xa9, 0xf4, 0x3d, 0x5e])
# IUnknown: {00000000-0000-0000-C000-000000000046}
IID_IUnknown = make_guid(0x00000000, 0x0000, 0x0000, [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])

CoInitializeEx(None, 0) # COINIT_MULTITHREADED

# CLSCTX_LOCAL_SERVER = 0x4, CLSCTX_INPROC_SERVER = 0x1, CLSCTX_ALL = 0x17
for ctx in [0x1, 0x4, 0x17]:
    p_obj = c_void_p()
    hr = CoCreateInstance(byref(CLSID_Manufacturing), None, ctx, byref(IID_IUnknown), byref(p_obj))
    print(f"CoCreateInstance(ctx={hex(ctx)}): hr={hex(hr & 0xffffffff)}, pObj={hex(p_obj.value or 0)}")
