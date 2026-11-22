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

# b8854969-a97f-42bf-8b2a-9cba977826df is IXboxInfoUtilitiesStatics!
IID_IXboxInfoUtilitiesStatics = make_guid('b8854969-a97f-42bf-8b2a-9cba977826df')

hs = c_void_p()
create_hstring('Microsoft.Xbox.Development.XboxInfoUtilities', len('Microsoft.Xbox.Development.XboxInfoUtilities'), byref(hs))

pInfo = c_void_p()
hr = ro_get_factory(hs, byref(IID_IXboxInfoUtilitiesStatics), byref(pInfo))
print(f"Query IXboxInfoUtilitiesStatics hr: {hex(hr & 0xffffffff)}, ptr: {pInfo.value}")

if hr == 0 and pInfo.value:
    vtable = ctypes.cast(pInfo.value, POINTER(POINTER(c_void_p))).contents
    
    # Let's inspect methods starting at Slot 6
    # Let's test calling Slot 6, 7, 8... to see which one is get_CertType
    # In WinMD order around 0xe957:
    # get_IsDeprecatedXboxDevkitHardware
    # get_CertType (&certType -> int)
    # get_SandboxId (&hstring)
    # put_SandboxId (hstring)
    # ...
    # Let's query slot 6 to 15:
    for slot in range(6, 16):
        out_val = c_uint(0)
        proto = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_uint))
        fn = proto(vtable[slot])
        try:
            res = fn(pInfo, byref(out_val))
            print(f"Slot {slot} returned hr: {hex(res & 0xffffffff)}, val: {out_val.value} ({hex(out_val.value)})")
            if res == 0 and out_val.value != 0:
                # If it's an HSTRING, let's try reading it
                length = c_uint(0)
                ptr = get_string_raw(out_val.value, byref(length))
                if ptr:
                    wstr = ctypes.wstring_at(ptr, length.value)
                    print(f"   as HSTRING: '{wstr}'")
        except Exception as e:
            print(f"Slot {slot} call error: {e}")

