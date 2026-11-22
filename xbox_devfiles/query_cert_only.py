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

IID_IXboxInfoUtilitiesStatics = make_guid('b8854969-a97f-42bf-8b2a-9cba977826df')

hs = c_void_p()
create_hstring('Microsoft.Xbox.Development.XboxInfoUtilities', len('Microsoft.Xbox.Development.XboxInfoUtilities'), byref(hs))

pInfo = c_void_p()
hr = ro_get_factory(hs, byref(IID_IXboxInfoUtilitiesStatics), byref(pInfo))

vtable = ctypes.cast(pInfo.value, POINTER(POINTER(c_void_p))).contents

# Slot 7 is get_CertType:
out_val = c_uint(0)
proto = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_uint))
fn = proto(vtable[7])
hr = fn(pInfo, byref(out_val))
print(f"CertType result: hr={hex(hr & 0xffffffff)}, value={out_val.value}")
