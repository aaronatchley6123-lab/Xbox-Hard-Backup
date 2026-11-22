import ctypes
from ctypes import wintypes

ntdll = ctypes.WinDLL("ntdll")

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
        ("SecurityDescriptor", ctypes.c_void_p),
        ("SecurityQualityOfService", ctypes.c_void_p)
    ]

class OBJECT_DIRECTORY_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("Name", UNICODE_STRING),
        ("TypeName", UNICODE_STRING)
    ]

def init_unicode_str(s):
    u = UNICODE_STRING()
    u.Buffer = ctypes.c_wchar_p(s)
    u.Length = len(s) * 2
    u.MaximumLength = (len(s) + 1) * 2
    return u

def query_dir(path):
    h = wintypes.HANDLE()
    oa = OBJECT_ATTRIBUTES()
    u = init_unicode_str(path)
    oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
    oa.RootDirectory = None
    oa.ObjectName = ctypes.pointer(u)
    oa.Attributes = 0x40 # OBJ_CASE_INSENSITIVE
    
    status = ntdll.NtOpenDirectoryObject(ctypes.byref(h), 0x0001 | 0x0002, ctypes.byref(oa))
    if status != 0:
        print(f"NtOpenDirectoryObject failed for {path}: 0x{status:08X}")
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
            type_name = info.TypeName.Buffer[:info.TypeName.Length // 2]
            entries.append((name, type_name))
            ptr += ctypes.sizeof(OBJECT_DIRECTORY_INFORMATION)
            
    ntdll.NtClose(h)
    return entries

print("=== Objects in \\Device ===")
device_entries = query_dir("\\Device")
harddisk_volumes = []
harddisks = []
other_devices = []

for name, tname in device_entries:
    if "harddiskvolume" in name.lower():
        harddisk_volumes.append(name)
    elif "harddisk" in name.lower():
        harddisks.append(name)
    else:
        other_devices.append((name, tname))

# Sort HarddiskVolumes numerically
def vol_num(v):
    try:
        return int(''.join(filter(str.isdigit, v)))
    except:
        return 999

harddisk_volumes.sort(key=vol_num)

print(f"Total HarddiskVolumes found: {len(harddisk_volumes)}")
for v in harddisk_volumes:
    print(" ", v)

print(f"\nHarddisks ({len(harddisks)}):", harddisks)

print("\n=== Objects in \\GLOBAL?? (DOS Devices) ===")
dos_entries = query_dir("\\GLOBAL??")
mapped_drives = {}
for name, tname in dos_entries:
    if len(name) == 2 and name[1] == ':':
        mapped_drives[name] = tname

print(f"Drive Letters mapped in \\GLOBAL?? ({len(mapped_drives)}):")
for d in sorted(mapped_drives.keys()):
    print(f"  {d}")
