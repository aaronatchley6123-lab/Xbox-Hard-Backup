import ctypes
from ctypes import wintypes

ntdll = ctypes.WinDLL("ntdll")

class UNICODE_STRING(ctypes.Structure):
    _fields_ = [("Length", wintypes.USHORT), ("MaximumLength", wintypes.USHORT), ("Buffer", wintypes.LPWSTR)]

class OBJECT_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.ULONG), ("RootDirectory", wintypes.HANDLE),
        ("ObjectName", ctypes.POINTER(UNICODE_STRING)), ("Attributes", wintypes.ULONG),
        ("SecurityDescriptor", ctypes.c_void_p), ("SecurityQualityOfService", ctypes.c_void_p)
    ]

class OBJECT_DIRECTORY_INFORMATION(ctypes.Structure):
    _fields_ = [("Name", UNICODE_STRING), ("TypeName", UNICODE_STRING)]

def query_symlink(path, name):
    h = wintypes.HANDLE()
    oa = OBJECT_ATTRIBUTES()
    u = UNICODE_STRING()
    full_path = f"{path}\\{name}"
    u.Buffer = ctypes.c_wchar_p(full_path)
    u.Length = len(full_path) * 2
    u.MaximumLength = (len(full_path) + 1) * 2
    oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
    oa.ObjectName = ctypes.pointer(u)
    oa.Attributes = 0x40
    
    status = ntdll.NtOpenSymbolicLinkObject(ctypes.byref(h), 0x0001, ctypes.byref(oa))
    if status != 0:
        return ""
    
    target_u = UNICODE_STRING()
    buf = ctypes.create_unicode_buffer(1024)
    target_u.Buffer = ctypes.cast(buf, wintypes.LPWSTR)
    target_u.Length = 0
    target_u.MaximumLength = 2048
    ret_len = wintypes.ULONG(0)
    
    ntdll.NtQuerySymbolicLinkObject(h, ctypes.byref(target_u), ctypes.byref(ret_len))
    ntdll.NtClose(h)
    return buf.value

def query_dir(path):
    h = wintypes.HANDLE()
    oa = OBJECT_ATTRIBUTES()
    u = UNICODE_STRING()
    u.Buffer = ctypes.c_wchar_p(path)
    u.Length = len(path) * 2
    u.MaximumLength = (len(path) + 1) * 2
    oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
    oa.ObjectName = ctypes.pointer(u)
    oa.Attributes = 0x40
    
    status = ntdll.NtOpenDirectoryObject(ctypes.byref(h), 0x0001 | 0x0002, ctypes.byref(oa))
    if status != 0:
        return []
    
    entries = []
    buf = (ctypes.c_byte * 65536)()
    context = wintypes.ULONG(0)
    ret_len = wintypes.ULONG(0)
    while True:
        status = ntdll.NtQueryDirectoryObject(h, buf, len(buf), False, False, ctypes.byref(context), ctypes.byref(ret_len))
        if status != 0:
            break
        ptr = ctypes.addressof(buf)
        while True:
            info = OBJECT_DIRECTORY_INFORMATION.from_address(ptr)
            if info.Name.Length == 0:
                break
            name = info.Name.Buffer[:info.Name.Length // 2]
            tname = info.TypeName.Buffer[:info.TypeName.Length // 2]
            entries.append((name, tname))
            ptr += ctypes.sizeof(OBJECT_DIRECTORY_INFORMATION)
    ntdll.NtClose(h)
    return entries

print("Scanning \\GLOBAL?? for links to Volume16 and Volume19...")
for name, tname in query_dir("\\GLOBAL??"):
    if tname == "SymbolicLink":
        target = query_symlink("\\GLOBAL??", name)
        if any(k in target.lower() for k in ["volume16", "volume19", "harddisk16", "harddisk19"]):
            print(f"  \\GLOBAL??\\{name} -> {target}")

print("Scanning \\ArcName...")
for name, tname in query_dir("\\ArcName"):
    if tname == "SymbolicLink":
        target = query_symlink("\\ArcName", name)
        print(f"  \\ArcName\\{name} -> {target}")

print("Scanning \\Device for links...")
for name, tname in query_dir("\\Device"):
    if tname == "SymbolicLink":
        target = query_symlink("\\Device", name)
        if any(k in target.lower() for k in ["volume16", "volume19", "harddisk16", "harddisk19"]):
            print(f"  \\Device\\{name} -> {target}")
