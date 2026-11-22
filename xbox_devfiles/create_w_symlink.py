import ctypes
import os

ntdll = ctypes.windll.ntdll

class UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", ctypes.c_ushort),
        ("MaximumLength", ctypes.c_ushort),
        ("Buffer", ctypes.c_wchar_p)
    ]

class OBJECT_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Length", ctypes.c_ulong),
        ("RootDirectory", ctypes.c_void_p),
        ("ObjectName", ctypes.POINTER(UNICODE_STRING)),
        ("Attributes", ctypes.c_ulong),
        ("SecurityDescriptor", ctypes.c_void_p),
        ("SecurityQualityOfService", ctypes.c_void_p)
    ]

def make_unicode_string(s):
    u = UNICODE_STRING()
    u.Buffer = s
    u.Length = len(s) * 2
    u.MaximumLength = (len(s) + 1) * 2
    return u

def create_global_link(link_name, target_path):
    u_link = make_unicode_string(link_name)
    u_target = make_unicode_string(target_path)
    
    oa = OBJECT_ATTRIBUTES()
    oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
    oa.RootDirectory = None
    oa.ObjectName = ctypes.pointer(u_link)
    oa.Attributes = 0x40 | 0x02 # OBJ_CASE_INSENSITIVE | OBJ_PERMANENT (or OBJ_OPENIF)
    oa.SecurityDescriptor = None
    oa.SecurityQualityOfService = None
    
    h = ctypes.c_void_p()
    status = ntdll.NtCreateSymbolicLinkObject(ctypes.byref(h), 0xF0001, ctypes.byref(oa), ctypes.byref(u_target))
    print(f"NtCreateSymbolicLinkObject('{link_name}' -> '{target_path}') status: {hex(status & 0xffffffff)}")
    return h.value

os.makedirs(r"D:\Windows11", exist_ok=True)
create_global_link(r"\Global??\W:", r"\Device\HarddiskVolume6\Windows11")
