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
fn_addr = vtable[7]
print(f"Live Slot 7 function address: {hex(fn_addr)}")

# Read first 64 bytes of code at fn_addr
kernel32 = ctypes.windll.kernel32
buf = (ctypes.c_ubyte * 64)()
bytes_read = wintypes.DWORD(0)
# fn_addr is inside current process! We can read memory directly:
raw_code = ctypes.string_at(fn_addr, 64)
print(f"Bytes: {raw_code.hex()}")

