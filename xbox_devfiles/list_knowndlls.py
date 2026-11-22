import ctypes
from ctypes import wintypes

ntdll = ctypes.windll.ntdll

class UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.USHORT),
        ("MaximumLength", wintypes.USHORT),
        ("Buffer", wintypes.LPWSTR)
    ]

class OBJECT_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.ULONG),
        ("RootDirectory", wintypes.HANDLE),
        ("ObjectName", ctypes.POINTER(UNICODE_STRING)),
        ("Attributes", wintypes.ULONG),
        ("SecurityDescriptor", wintypes.LPVOID),
        ("SecurityQualityOfService", wintypes.LPVOID)
    ]

def make_unicode_string(s):
    u = UNICODE_STRING()
    u.Buffer = s
    u.Length = len(s) * 2
    u.MaximumLength = (len(s) + 1) * 2
    return u

def list_dir(path):
    h = wintypes.HANDLE()
    oa = OBJECT_ATTRIBUTES()
    oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
    us = make_unicode_string(path)
    oa.ObjectName = ctypes.pointer(us)
    oa.Attributes = 0x40 # OBJ_CASE_INSENSITIVE
    
    # NtOpenDirectoryObject
    status = ntdll.NtOpenDirectoryObject(ctypes.byref(h), 0x0001, ctypes.byref(oa))
    print(f"NtOpenDirectoryObject({path}) -> status: {hex(status & 0xFFFFFFFF)}")
    if status == 0:
        buf = ctypes.create_string_buffer(4096)
        context = wintypes.ULONG(0)
        ret_len = wintypes.ULONG(0)
        print("Known DLLs sections in kernel:")
        while True:
            st = ntdll.NtQueryDirectoryObject(h, buf, len(buf), False, False, ctypes.byref(context), ctypes.byref(ret_len))
            if st != 0:
                break
            # Read OBJECT_DIRECTORY_INFORMATION
            # Each entry has Name (UNICODE_STRING) + TypeName (UNICODE_STRING)
            # Just print raw matches
            import re
            names = re.findall(rb'([a-zA-Z0-9_\-\.]+\.dll)', buf.raw)
            for n in set(names):
                print(f"  {n.decode('ascii', errors='ignore')}")
            break
        ntdll.NtClose(h)

list_dir(r"\KnownDlls")
