import ctypes
from ctypes import wintypes

advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

class LUID(ctypes.Structure):
    _fields_ = [
        ("LowPart", wintypes.DWORD),
        ("HighPart", wintypes.LONG)
    ]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Luid", LUID),
        ("Attributes", wintypes.DWORD)
    ]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [
        ("PrivilegeCount", wintypes.DWORD),
        ("Privileges", LUID_AND_ATTRIBUTES * 32)
    ]

SE_PRIVILEGE_ENABLED = 0x00000002
TOKEN_ADJUST_PRIVILEGES = 0x0020
TOKEN_QUERY = 0x0008

def enable_privilege(priv_name):
    hToken = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, ctypes.byref(hToken)):
        return False, ctypes.get_last_error()
    
    luid = LUID()
    if not advapi32.LookupPrivilegeValueW(None, priv_name, ctypes.byref(luid)):
        kernel32.CloseHandle(hToken)
        return False, ctypes.get_last_error()
        
    tp = TOKEN_PRIVILEGES()
    tp.PrivilegeCount = 1
    tp.Privileges[0].Luid = luid
    tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED
    
    res = advapi32.AdjustTokenPrivileges(hToken, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
    err = ctypes.get_last_error()
    kernel32.CloseHandle(hToken)
    return (res != 0 and err == 0), err

print("=== Enabling NT Privileges ===")
privs = [
    "SeBackupPrivilege",
    "SeRestorePrivilege",
    "SeManageVolumePrivilege",
    "SeTakeOwnershipPrivilege",
    "SeSecurityPrivilege",
    "SeTcbPrivilege",
    "SeDebugPrivilege"
]

for p in privs:
    ok, err = enable_privilege(p)
    print(f"  {p}: {'ENABLED' if ok else f'FAILED (error {err})'}")

# Now test opening Volume 16 and 19 with FILE_FLAG_BACKUP_SEMANTICS
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3
FILE_FLAG_BACKUP_SEMANTICS = 0x02000000

print("\n=== Testing Access to HarddiskVolume16 and HarddiskVolume19 ===")
for num in [16, 19]:
    vol_path = f"\\\\.\\HarddiskVolume{num}"
    h = kernel32.CreateFileW(
        vol_path,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        None
    )
    if h != -1:
        print(f"HarddiskVolume{num}: SUCCESS! Handle opened for READ (handle = {h})")
        # Try read first 512 bytes
        buf = (ctypes.c_byte * 512)()
        bytes_read = wintypes.DWORD()
        if kernel32.ReadFile(h, buf, 512, ctypes.byref(bytes_read), None):
            raw = bytes(buf[:bytes_read.value])
            print(f"  Read {bytes_read.value} bytes successfully. First 32 bytes: {raw[:32].hex()}")
            # Check for filesystem signature (NTFS / FAT / XVD / VHD)
            if b"NTFS" in raw:
                print("  Signature: NTFS Boot Sector detected!")
            elif b"MSDOS" in raw or b"FAT" in raw:
                print("  Signature: FAT Boot Sector detected!")
            elif b"EFI PART" in raw:
                print("  Signature: GPT Partition Header detected!")
            else:
                print("  Signature:", raw[3:11])
        else:
            print("  ReadFile error:", ctypes.get_last_error())
        kernel32.CloseHandle(h)
    else:
        err = ctypes.get_last_error()
        print(f"HarddiskVolume{num}: CreateFileW failed with error {err}")
