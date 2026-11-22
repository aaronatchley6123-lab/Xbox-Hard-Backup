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
# IAsyncInfo IID: {00000036-0000-0000-C000-000000000046}
IID_IAsyncInfo = make_guid(0x00000036, 0x0000, 0x0000, [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])

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

# Method 682 (Slot 27 in WinMD):
# Let's verify which slot in ProxyStub is RunUnattendedScriptOnUsbAsync
# In winmd:
# Slot 26: get_HasUnattendedScriptOnUsb -> ObjectStublessClient26
# Slot 27: RunUnattendedScriptOnUsbAsync -> ObjectStublessClient27
proto_async = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_void_p))
RunUnattendedScriptOnUsbAsync = proto_async(vtable_statics[27])

p_async_action = c_void_p()
hr = RunUnattendedScriptOnUsbAsync(p_statics, byref(p_async_action))
print(f"[+] RunUnattendedScriptOnUsbAsync: hr={hex(hr & 0xffffffff)}, pAsync={hex(p_async_action.value or 0)}")

if p_async_action.value:
    p_async_info = c_void_p()
    vtable_action = POINTER(c_void_p).from_address(p_async_action.value)
    QI_action = QueryInterface_proto(vtable_action[0])
    hr = QI_action(p_async_action, byref(IID_IAsyncInfo), byref(p_async_info))
    print(f"[+] QI for IAsyncInfo: hr={hex(hr & 0xffffffff)}, pInfo={hex(p_async_info.value or 0)}")
    
    if p_async_info.value:
        vtable_info = POINTER(c_void_p).from_address(p_async_info.value)
        # Slot 7: get_Status(AsyncStatus* status)
        # Slot 8: get_ErrorCode(HRESULT* errorCode)
        proto_status = ctypes.WINFUNCTYPE(c_long, c_void_p, POINTER(c_long))
        get_Status = proto_status(vtable_info[7])
        get_ErrorCode = proto_status(vtable_info[8])
        
        for poll in range(20):
            status = c_long(0)
            err = c_long(0)
            get_Status(p_async_info, byref(status))
            get_ErrorCode(p_async_info, byref(err))
            print(f"  [Poll {poll+1}] Status={status.value} (0=Started,1=Completed,2=Canceled,3=Error), ErrorCode={hex(err.value & 0xffffffff)}")
            if status.value != 0:
                break
            time.sleep(1)
