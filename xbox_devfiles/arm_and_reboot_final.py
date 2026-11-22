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

class GUID(ctypes.Structure):
    _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]

def make_guid(d1, d2, d3, b_list):
    g = GUID()
    g.Data1 = d1; g.Data2 = d2; g.Data3 = d3
    for i, b in enumerate(b_list): g.Data4[i] = b
    return g

IID_IActivationFactory = make_guid(0x00000035, 0x0000, 0x0000, [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])
IID_IUnattendedUtilitiesStatics = make_guid(0xde87ad07, 0x75dc, 0x4eec, [0x92, 0x26, 0x56, 0x28, 0xe9, 0x8b, 0x99, 0x14])

RoInitialize(1)
class_name = "Microsoft.Xbox.Development.UnattendedUtilities"
h_class = c_void_p()
WindowsCreateString(class_name, len(class_name), byref(h_class))

p_factory = c_void_p()
RoGetActivationFactory(h_class, byref(IID_IActivationFactory), byref(p_factory))
vtable_factory = POINTER(c_void_p).from_address(p_factory.value)
QueryInterface_proto = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(GUID), POINTER(c_void_p))
QueryInterface = QueryInterface_proto(vtable_factory[0])

p_statics = c_void_p()
QueryInterface(p_factory, byref(IID_IUnattendedUtilitiesStatics), byref(p_statics))
vtable_statics = POINTER(c_void_p).from_address(p_statics.value)

# Unblock scripts
proto_put_bool = ctypes.WINFUNCTYPE(c_long, c_void_p, ctypes.c_byte)
put_ShouldBlockUnattend = proto_put_bool(vtable_statics[23])
put_ShouldBlockUsb = proto_put_bool(vtable_statics[17])
put_ShouldRunOobe = proto_put_bool(vtable_statics[15])

put_ShouldBlockUnattend(p_statics, 0)
put_ShouldBlockUsb(p_statics, 0)
hr = put_ShouldRunOobe(p_statics, 1)
print(f"[+] ShouldRunOobeScript set in NVRAM: {hex(hr & 0xffffffff)}")

# Reboot via xpal
xpal = <REDACTED_CERT>
XpalInitiateSystemShutdown = xpal.XpalInitiateSystemShutdown
XpalInitiateSystemShutdown.argtypes = [ctypes.c_ulong]
XpalInitiateSystemShutdown.restype = ctypes.c_long
print("[*] Calling XpalInitiateSystemShutdown(1)...")
hr = XpalInitiateSystemShutdown(1)
print(f"[+] Initiated shutdown: {hr}")
