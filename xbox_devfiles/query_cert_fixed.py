import ctypes
from ctypes import wintypes, c_void_p, POINTER, byref, c_int, c_uint

combase = ctypes.windll.combase
ro_init = combase.RoInitialize
ro_init(1)

ro_get_factory = combase.RoGetActivationFactory
create_hstring = combase.WindowsCreateString
delete_hstring = combase.WindowsDeleteString
get_string_raw = combase.WindowsGetStringRawBuffer

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

# Slot 7 returned val: 5! That is an enum: CertType!
# In 64-bit Windows, HSTRING is 64-bit (c_void_p)!
# Let's test reading HSTRING with c_void_p:
def get_hstring(slot):
    out_hs = c_void_p()
    proto = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_void_p))
    fn = proto(vtable[slot])
    hr = fn(pInfo, byref(out_hs))
    if hr == 0 and out_hs.value:
        length = c_uint(0)
        ptr = get_string_raw(out_hs, byref(length))
        s = ctypes.wstring_at(ptr, length.value)
        delete_hstring(out_hs)
        return s
    return f"hr={hex(hr & 0xffffffff)}"

def get_int(slot):
    out_val = c_uint(0)
    proto = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_uint))
    fn = proto(vtable[slot])
    hr = fn(pInfo, byref(out_val))
    return hr, out_val.value

print("Slot 6 (HSTRING):", get_hstring(6))
hr7, val7 = get_int(7)
print(f"Slot 7 (CertType enum): hr={hex(hr7 & 0xffffffff)}, val={val7}")
print("Slot 8 (HSTRING):", get_hstring(8))
print("Slot 9 (HSTRING):", get_hstring(9))
hr10, val10 = get_int(10)
print(f"Slot 10: hr={hex(hr10 & 0xffffffff)}, val={val10}")
hr11, val11 = get_int(11)
print(f"Slot 11: hr={hex(hr11 & 0xffffffff)}, val={val11}")
print("Slot 12 (HSTRING):", get_hstring(12))

