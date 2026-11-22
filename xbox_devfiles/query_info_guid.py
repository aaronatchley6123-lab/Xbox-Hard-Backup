import sys, ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, c_wchar_p, POINTER, byref

combase = ctypes.windll.combase
RoInitialize = combase.RoInitialize
RoInitialize.argtypes = [c_ulong]
RoInitialize.restype = c_long

RoGetActivationFactory = combase.RoGetActivationFactory
RoGetActivationFactory.argtypes = [c_void_p, c_void_p, POINTER(c_void_p)]
RoGetActivationFactory.restype = c_long

WindowsCreateString = combase.WindowsCreateString
WindowsCreateString.argtypes = [c_wchar_p, c_ulong, POINTER(c_void_p)]
WindowsCreateString.restype = c_long

WindowsGetStringRawBuffer = combase.WindowsGetStringRawBuffer
WindowsGetStringRawBuffer.argtypes = [c_void_p, POINTER(c_ulong)]
WindowsGetStringRawBuffer.restype = c_wchar_p

WindowsDeleteString = combase.WindowsDeleteString
WindowsDeleteString.argtypes = [c_void_p]
WindowsDeleteString.restype = c_long

class GUID(ctypes.Structure):
    _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]

def make_guid(d1, d2, d3, b_list):
    g = GUID()
    g.Data1 = d1; g.Data2 = d2; g.Data3 = d3
    for i, b in enumerate(b_list): g.Data4[i] = b
    return g

IID_IActivationFactory = make_guid(0x00000035, 0x0000, 0x0000, [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])
# GUID 1: caf0b34b-dbec-4f56-b7cf-d58c3bce2d2e
IID_IXboxInfo1 = make_guid(0xcaf0b34b, 0xdbec, 0x4f56, [0xb7, 0xcf, 0xd5, 0x8c, 0x3b, 0xce, 0x2d, 0x2e])
# GUID 2: 5ac32d31-b883-45c6-b6d3-3326e5aea74d
IID_IXboxInfo2 = make_guid(0x5ac32d31, 0xb883, 0x45c6, [0xb6, 0xd3, 0x33, 0x26, 0xe5, 0xae, 0xa7, 0x4d])
# GUID 3: bafe2867-5223-4378-a79c-bf3f602b926e
IID_IXboxInfo3 = make_guid(0xbafe2867, 0x5223, 0x4378, [0xa7, 0x9c, 0xbf, 0x3f, 0x60, 0x2b, 0x92, 0x6e])

RoInitialize(1)
class_name = "Microsoft.Xbox.Development.XboxInfoUtilities"
h_class = c_void_p()
WindowsCreateString(class_name, len(class_name), byref(h_class))

p_factory = c_void_p()
RoGetActivationFactory(h_class, byref(IID_IActivationFactory), byref(p_factory))
vtable_factory = POINTER(c_void_p).from_address(p_factory.value)
QueryInterface_proto = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(GUID), POINTER(c_void_p))
QueryInterface = QueryInterface_proto(vtable_factory[0])

for idx, g in [("GUID1", IID_IXboxInfo1), ("GUID2", IID_IXboxInfo2), ("GUID3", IID_IXboxInfo3)]:
    p_iface = c_void_p()
    hr = QueryInterface(p_factory, byref(g), byref(p_iface))
    print(f"[*] QI({idx}): hr={hex(hr & 0xffffffff)}, ptr={hex(p_iface.value or 0)}")
    if hr == 0 and p_iface.value:
        vt = POINTER(c_void_p).from_address(p_iface.value)
        # get_CertType is slot 10
        proto_int = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_long))
        for s in [6, 7, 8, 9, 10, 11, 12]:
            val = c_long(0)
            try:
                fn = proto_int(vt[s])
                hres = fn(p_iface, byref(val))
                print(f"    Slot {s}: hr={hex(hres & 0xffffffff)}, val={val.value} ({hex(val.value & 0xffffffff)})")
            except Exception as e:
                print(f"    Slot {s}: err={e}")
