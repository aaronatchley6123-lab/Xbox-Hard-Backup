import ctypes
from ctypes import wintypes, c_void_p, POINTER, byref

combase = ctypes.windll.combase
ro_init = combase.RoInitialize
ro_init(1)

ro_get_factory = combase.RoGetActivationFactory
create_hstring = combase.WindowsCreateString

class GUID(ctypes.Structure):
    _fields_ = [
        ('Data1', wintypes.DWORD),
        ('Data2', wintypes.WORD),
        ('Data3', wintypes.WORD),
        ('Data4', wintypes.BYTE * 8)
    ]

def make_guid(s):
    import uuid
    u = uuid.UUID(s)
    fields = u.fields
    g = GUID()
    g.Data1 = fields[0]
    g.Data2 = fields[1]
    g.Data3 = fields[2]
    g.Data4[0] = fields[3]
    g.Data4[1] = fields[4]
    b = fields[5].to_bytes(6, 'big')
    for i in range(6):
        g.Data4[2+i] = b[i]
    return g

IID_IInspectable = make_guid('AF86E2E0-B12D-4c6a-9C5A-D7AA65101E90')

hs = c_void_p()
create_hstring('Microsoft.Xbox.Development.XboxInfoUtilities', len('Microsoft.Xbox.Development.XboxInfoUtilities'), byref(hs))

factory = c_void_p()
hr = ro_get_factory(hs, byref(IID_IInspectable), byref(factory))
print(f"RoGetActivationFactory returned: {hex(hr & 0xffffffff)}, factory ptr: {factory.value}")

if hr == 0 and factory.value:
    vtable = ctypes.cast(factory.value, POINTER(POINTER(c_void_p))).contents
    print("Factory vtable:")
    for i in range(20):
        print(f"  Slot {i}: {hex(vtable[i])}")
