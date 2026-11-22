import ctypes, os
from ctypes import wintypes

ole32 = ctypes.WinDLL("ole32.dll")
ole32.CoInitializeEx(None, 6)

class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_ulong),
        ("Data2", ctypes.c_ushort),
        ("Data3", ctypes.c_ushort),
        ("Data4", ctypes.c_ubyte * 8)
    ]

def make_guid(d1, d2, d3, b):
    g = GUID()
    g.Data1 = d1
    g.Data2 = d2
    g.Data3 = d3
    for i in range(8):
        g.Data4[i] = b[i]
    return g

# CLSID {1F849CCE-2546-4B9F-B03E-4004781BDC40}
clsid = make_guid(0x1F849CCE, 0x2546, 0x4B9F, [0xB0, 0x3E, 0x40, 0x04, 0x78, 0x1B, 0xDC, 0x40])

# IID {9B25C299-03B6-4A14-827D-095485D0C022}
iid = make_guid(0x9B25C299, 0x03B6, 0x4A14, [0x82, 0x7D, 0x09, 0x54, 0x85, 0xD0, 0xC0, 0x22])

# IUnknown
iunknown = make_guid(0, 0, 0, [0xC0, 0, 0, 0, 0, 0, 0, 0x46])

ptr = ctypes.c_void_p()
hr = ole32.CoCreateInstance(ctypes.byref(clsid), None, 1, ctypes.byref(iid), ctypes.byref(ptr))
print(f"CoCreateInstance with IID 9B25C299: hr = {hex(hr & 0xFFFFFFFF)}, ptr = {hex(ptr.value if ptr.value else 0)}")

hr_unk = ole32.CoCreateInstance(ctypes.byref(clsid), None, 1, ctypes.byref(iunknown), ctypes.byref(ptr))
print(f"CoCreateInstance with IUnknown: hr = {hex(hr_unk & 0xFFFFFFFF)}, ptr = {hex(ptr.value if ptr.value else 0)}")

