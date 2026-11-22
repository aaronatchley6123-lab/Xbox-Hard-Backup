import ctypes
from ctypes import wintypes, c_void_p, POINTER, byref, c_int, c_uint

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
create_hstring('Microsoft.Xbox.Development.UnattendedUtilities', len('Microsoft.Xbox.Development.UnattendedUtilities'), byref(hs))

factory = c_void_p()
hr = ro_get_factory(hs, byref(IID_IInspectable), byref(factory))

GetIids_proto = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_uint), POINTER(c_void_p))
vtable = ctypes.cast(factory.value, POINTER(POINTER(c_void_p))).contents
get_iids = GetIids_proto(vtable[3])

count = c_uint(0)
piids = c_void_p()
hr = get_iids(factory, byref(count), byref(piids))
print(f"GetIids count = {count.value}")

if hr == 0 and count.value > 0:
    guid_array = ctypes.cast(piids.value, POINTER(GUID))
    import uuid
    for i in range(count.value):
        u = uuid.UUID(bytes_le=bytes(guid_array[i]))
        print(f"  Interface {i}: {u}")

print("Vtable methods (slots 6..25):")
for slot in range(6, 26):
    print(f"  Slot {slot}: {hex(vtable[slot])}")
