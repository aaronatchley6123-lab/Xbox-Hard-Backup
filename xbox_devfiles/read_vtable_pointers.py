import sys, os, ctypes
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

print(f"[*] p_statics object address: {hex(p_statics.value)}")
print(f"[*] vtable_statics address:   {hex(vtable_statics.contents.value if hasattr(vtable_statics, 'contents') else 0)}")

# Print function pointer for Slot 10 (RunUnattendedScript) and Slot 9 and Slot 27
print("Vtable Function Pointers:")
for i in [6, 7, 8, 9, 10, 11, 14, 15, 26, 27]:
    fn_ptr = vtable_statics[i]
    print(f"  Slot {i}: {hex(fn_ptr)}")

# Let's read the module base containing this function pointer
kernel32 = ctypes.windll.kernel32
class MODULEINFO(ctypes.Structure):
    _fields_ = [('lpBaseOfDll', c_void_p), ('SizeOfImage', wintypes.DWORD), ('EntryPoint', c_void_p)]

# Use VirtualQuery to see where the function pointer lives
class MEMORY_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('BaseAddress', c_void_p),
        ('AllocationBase', c_void_p),
        ('AllocationProtect', wintypes.DWORD),
        ('RegionSize', ctypes.c_size_t),
        ('State', wintypes.DWORD),
        ('Protect', wintypes.DWORD),
        ('Type', wintypes.DWORD)
    ]

mbi = MEMORY_BASIC_INFORMATION()
kernel32.VirtualQuery(c_void_p(vtable_statics[10]), byref(mbi), ctypes.sizeof(mbi))
print(f"[*] Slot 10 AllocationBase: {hex(mbi.AllocationBase or 0)}")

name_buf = ctypes.create_unicode_buffer(512)
kernel32.GetModuleFileNameW(c_void_p(mbi.AllocationBase), name_buf, 512)
print(f"[*] Module containing Slot 10 implementation: '{name_buf.value}'")
