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

IID_IUnattendedUtilitiesStatics = make_guid('de87ad07-75dc-4eec-9226-5628e98b9914')

hs = c_void_p()
create_hstring('Microsoft.Xbox.Development.UnattendedUtilities', len('Microsoft.Xbox.Development.UnattendedUtilities'), byref(hs))

pUnattend = c_void_p()
hr = ro_get_factory(hs, byref(IID_IUnattendedUtilitiesStatics), byref(pUnattend))
vtable = ctypes.cast(pUnattend.value, POINTER(POINTER(c_void_p))).contents

# put_ShouldRunOobeScript(1) (Slot 15)
proto_bool = ctypes.WINFUNCTYPE(c_int, c_void_p, wintypes.BYTE)
fn_oobe = proto_bool(vtable[15])
hr_oobe = fn_oobe(pUnattend, 1)
print(f"put_ShouldRunOobeScript(1) hr: {hex(hr_oobe & 0xffffffff)}")

# put_ShouldSkipAbortToast(1) (Slot 19)
fn_skip = proto_bool(vtable[19])
hr_skip = fn_skip(pUnattend, 1)
print(f"put_ShouldSkipAbortToast(1) hr: {hex(hr_skip & 0xffffffff)}")

# Now test Slot 9
script_hr = c_uint(0)
script_out_hs = c_void_p(0)
proto_slot9 = ctypes.WINFUNCTYPE(c_int, c_void_p, POINTER(c_uint), POINTER(c_void_p))
fn_slot9 = proto_slot9(vtable[9])

res = fn_slot9(pUnattend, byref(script_hr), byref(script_out_hs))
print(f"Slot 9 with OOBE flag returned HRESULT: {hex(res & 0xffffffff)}")
print(f"Script result HR: {hex(script_hr.value)}")

