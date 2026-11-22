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

# Slot 19: put_ShouldSkipAbortToast(boolean skip)
proto_put_bool = ctypes.WINFUNCTYPE(c_long, c_void_p, ctypes.c_byte)
put_ShouldSkipAbortToast = proto_put_bool(vtable_statics[19])
hr = put_ShouldSkipAbortToast(p_statics, 1)
print(f"[*] put_ShouldSkipAbortToast(1): hr={hex(hr & 0xffffffff)}")

# Slot 12: SendToastNotification(HSTRING title, HSTRING message)
proto_toast = ctypes.WINFUNCTYPE(c_long, c_void_p, c_void_p, c_void_p)
SendToast = proto_toast(vtable_statics[12])
title = "Manufacturing Trigger"
msg = "Running setup.xboxunattend..."
h_title = c_void_p()
h_msg = c_void_p()
WindowsCreateString(title, len(title), byref(h_title))
WindowsCreateString(msg, len(msg), byref(h_msg))
hr = SendToast(p_statics, h_title, h_msg)
print(f"[*] SendToastNotification: hr={hex(hr & 0xffffffff)}")
