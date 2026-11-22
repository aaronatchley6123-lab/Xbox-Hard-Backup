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

RoInitialize(1)
class_name = "Microsoft.Xbox.Development.XboxInfoUtilities"
h_class = c_void_p()
WindowsCreateString(class_name, len(class_name), byref(h_class))

p_factory = c_void_p()
RoGetActivationFactory(h_class, byref(IID_IActivationFactory), byref(p_factory))
vtable = POINTER(c_void_p).from_address(p_factory.value)

# Let's inspect get_CertType:
# Order in WinMD:
# Slot 6: get_ConsoleType
# Slot 7: get_ConsoleTypeString
# Slot 8: get_ConsoleTypeStringNoSpaces
# Slot 9: get_IsDeprecatedXboxDevkitHardware
# Slot 10: get_CertType
proto_int = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_long))
proto_str = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_void_p))

get_ConsoleType = proto_int(vtable[6])
val = c_long(0)
hr = get_ConsoleType(p_factory, byref(val))
print(f"[*] Slot 6 (ConsoleType): hr={hex(hr & 0xffffffff)}, val={val.value}")

get_ConsoleTypeStr = proto_str(vtable[7])
h_str = c_void_p()
hr = get_ConsoleTypeStr(p_factory, byref(h_str))
if h_str.value:
    l = c_ulong(0)
    print(f"[*] Slot 7 (ConsoleTypeString): '{WindowsGetStringRawBuffer(h_str, byref(l))}'")
    WindowsDeleteString(h_str)

get_CertType = proto_int(vtable[10])
cert_type = c_long(0)
hr = get_CertType(p_factory, byref(cert_type))
print(f"[*] Slot 10 (CertType): hr={hex(hr & 0xffffffff)}, certType={cert_type.value}")
