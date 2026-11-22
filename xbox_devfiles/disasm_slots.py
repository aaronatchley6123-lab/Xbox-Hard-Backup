import ctypes

combase = ctypes.WinDLL('combase.dll')
combase.RoInitialize(1)

class HSTRING(ctypes.c_void_p): pass
hs = HSTRING()
class_name = "Microsoft.Xbox.Development.UnattendedUtilities"
combase.WindowsCreateString(class_name, len(class_name), ctypes.byref(hs))

class GUID(ctypes.Structure):
    _fields_ = [('Data1', ctypes.c_ulong), ('Data2', ctypes.c_ushort), ('Data3', ctypes.c_ushort), ('Data4', ctypes.c_ubyte * 8)]

iid_statics = GUID(0xde87ad07, 0x75dc, 0x4eec, (ctypes.c_ubyte * 8)(0x92, 0x26, 0x56, 0x28, 0xe9, 0x8b, 0x99, 0x14))

pStatics = ctypes.c_void_p()
combase.RoGetActivationFactory(hs, ctypes.byref(iid_statics), ctypes.byref(pStatics))

vtable = ctypes.cast(pStatics, ctypes.POINTER(ctypes.c_void_p)).contents.value

for slot in range(16, 25):
    fn_addr = ctypes.cast(vtable + slot * 8, ctypes.POINTER(ctypes.c_void_p)).contents.value
    code = ctypes.string_at(fn_addr, 32)
    print(f"Slot {slot} (0x{fn_addr:x}): {code.hex()}")
