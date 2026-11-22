import sys, os, time, ctypes
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

proto_put_bool = ctypes.WINFUNCTYPE(c_long, c_void_p, ctypes.c_byte)
put_ShouldBlockUnattend = proto_put_bool(vtable_statics[23])
put_ShouldBlockUsb = proto_put_bool(vtable_statics[17])
put_ShouldRunOobe = proto_put_bool(vtable_statics[15])

put_ShouldBlockUnattend(p_statics, 0)
put_ShouldBlockUsb(p_statics, 0)
put_ShouldRunOobe(p_statics, 1)

proto_get_bool = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(ctypes.c_byte))
get_HasScript = proto_get_bool(vtable_statics[26])

print("[*] Listener active: Waiting for USB to be unplugged, then re-inserted...")

was_unplugged = False
for step in range(60):
    b = ctypes.c_byte(0)
    get_HasScript(p_statics, byref(b))
    has_script = b.value == 1
    
    if not has_script and not was_unplugged:
        was_unplugged = True
        print("[!] USB DISCONNECTED detected by XboxDevService! Now PLUG IT BACK IN...")
        
    if was_unplugged and has_script:
        print("[!] USB ARRIVAL EVENT TRIGGERED! Script detected on USB!")
        time.sleep(2)
        break
        
    # Check for success logs
    if os.path.exists(r"E:\system_success.log"):
        print("[!] LOG CREATED ON E:\\system_success.log:")
        with open(r"E:\system_success.log", "r") as f:
            print(f.read())
        break
    if os.path.exists(r"D:\DevelopmentFiles\system_success.log"):
        print("[!] LOG CREATED ON D:\\DevelopmentFiles\\system_success.log:")
        with open(r"D:\DevelopmentFiles\system_success.log", "r") as f:
            print(f.read())
        break
        
    time.sleep(1)

print("[*] Checking logs post-event...")
for check in range(10):
    if os.path.exists(r"E:\system_success.log"):
        print("[!] LOG CREATED ON E:\\system_success.log:")
        with open(r"E:\system_success.log", "r") as f:
            print(f.read())
        break
    if os.path.exists(r"D:\DevelopmentFiles\system_success.log"):
        print("[!] LOG CREATED ON D:\\DevelopmentFiles\\system_success.log:")
        with open(r"D:\DevelopmentFiles\system_success.log", "r") as f:
            print(f.read())
        break
    time.sleep(1)
