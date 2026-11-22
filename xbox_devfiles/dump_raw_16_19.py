import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

SE_PRIVILEGES = [
    "SeBackupPrivilege",
    "SeRestorePrivilege",
    "SeManageVolumePrivilege",
    "SeTakeOwnershipPrivilege",
    "SeSecurityPrivilege",
    "SeDebugPrivilege",
    "SeTcbPrivilege"
]

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

hToken = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(hToken)):
    for priv in SE_PRIVILEGES:
        luid = LUID()
        if advapi32.LookupPrivilegeValueW(None, priv, ctypes.byref(luid)):
            tp = TOKEN_PRIVILEGES()
            tp.PrivilegeCount = 1
            tp.Privileges[0].Luid = luid
            tp.Privileges[0].Attributes = 0x00000002 # SE_PRIVILEGE_ENABLED
            advapi32.AdjustTokenPrivileges(hToken, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
    kernel32.CloseHandle(hToken)

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3
FILE_FLAG_BACKUP_SEMANTICS = 0x02000000

for num in [16, 19]:
    print(f"\n==========================================")
    print(f"[*] Probing HarddiskVolume{num}")
    print(f"==========================================")
    
    # Try opening as volume root first
    vol_root = f"\\\\?\\GLOBALROOT\\Device\\HarddiskVolume{num}\\"
    vol_name = ctypes.create_unicode_buffer(260)
    fs_name = ctypes.create_unicode_buffer(260)
    serial = wintypes.DWORD()
    max_len = wintypes.DWORD()
    flags = wintypes.DWORD()
    ok = kernel32.GetVolumeInformationW(vol_root, vol_name, 260, ctypes.byref(serial), ctypes.byref(max_len), ctypes.byref(flags), fs_name, 260)
    if ok:
        print(f"  Volume Label: '{vol_name.value}' | FS: {fs_name.value} | Flags: 0x{flags.value:X}")
    else:
        print(f"  GetVolumeInformation failed: {kernel32.GetLastError()}")
    
    # Try raw handle
    vol_device = f"\\\\.\\HarddiskVolume{num}"
    h = kernel32.CreateFileW(
        vol_device,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,
        None
    )
    if h == -1:
        # Try alternate path
        vol_device = f"\\\\?\\GLOBALROOT\\Device\\HarddiskVolume{num}"
        h = kernel32.CreateFileW(
            vol_device,
            GENERIC_READ,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS,
            None
        )

    if h != -1:
        print(f"  [+] SUCCESS: Raw handle opened: {h}")
        buf = (ctypes.c_byte * 4096)()
        bytes_read = wintypes.DWORD(0)
        if kernel32.ReadFile(h, buf, 4096, ctypes.byref(bytes_read), None):
            raw = bytes(buf[:bytes_read.value])
            print(f"  [+] Read {bytes_read.value} bytes from sector 0!")
            print(f"  Hex (first 64 bytes): {raw[:64].hex()}")
            ascii_preview = ''.join(chr(b) if 32 <= b < 127 else '.' for b in raw[:256])
            print(f"  ASCII Preview:\n    {ascii_preview}")
            
            # Identify signatures
            if b"NTFS" in raw:
                print("  [+] Filesystem: NTFS")
            elif b"FAT" in raw or b"MSDOS" in raw:
                print("  [+] Filesystem: FAT")
            elif b"EFI PART" in raw:
                print("  [+] Filesystem: GPT EFI Partition Table")
            elif b"XVD" in raw:
                print("  [+] Filesystem: XVD Container Header")
            else:
                # Look for printable strings
                import re
                strings = re.findall(rb"([A-Za-z0-9_\-\.\:\/ ]{4,})", raw)
                print("  [+] Strings in sector 0:", [s.decode('latin1', errors='ignore') for s in strings[:10]])
        else:
            print(f"  [-] ReadFile failed: {kernel32.GetLastError()}")
        kernel32.CloseHandle(h)
    else:
        print(f"  [-] CreateFileW failed: {kernel32.GetLastError()}")
