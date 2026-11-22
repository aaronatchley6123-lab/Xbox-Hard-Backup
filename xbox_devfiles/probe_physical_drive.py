import ctypes
from ctypes import wintypes
import struct

k32 = ctypes.windll.kernel32

IOCTL_DISK_GET_DRIVE_GEOMETRY_EX = 0x000700A0
IOCTL_DISK_GET_PARTITION_INFO_EX = 0x00070048

def probe_disk(disk_num):
    path = f"\\\\.\\PhysicalDrive{disk_num}"
    h = k32.CreateFileW(path, 0x80000000, 3, None, 3, 0x80, None)
    print(f"\n=== PhysicalDrive{disk_num} ({path}) ===")
    if h == -1:
        print(f"  CreateFileW failed: {k32.GetLastError()}")
        return
    
    # Query Geometry Ex
    buf = (ctypes.c_byte * 512)()
    ret = wintypes.DWORD(0)
    if k32.DeviceIoControl(h, IOCTL_DISK_GET_DRIVE_GEOMETRY_EX, None, 0, buf, 512, ctypes.byref(ret), None):
        raw = bytes(buf[:ret.value])
        # DISK_GEOMETRY_EX: DISK_GEOMETRY (24 bytes) + DiskSize (LONGLONG 8 bytes)
        disk_size = struct.unpack_from("<Q", raw, 24)[0]
        size_gb = disk_size / (1024**3)
        size_mb = disk_size / (1024**2)
        print(f"  Disk Size: {size_gb:.3f} GB ({size_mb:.1f} MB, {disk_size} bytes)")
    else:
        print(f"  IOCTL_DISK_GET_DRIVE_GEOMETRY_EX failed: {k32.GetLastError()}")
        
    # Read first sector
    sec = (ctypes.c_byte * 512)()
    bytes_read = wintypes.DWORD(0)
    if k32.ReadFile(h, sec, 512, ctypes.byref(bytes_read), None):
        data = bytes(sec[:bytes_read.value])
        print(f"  Sector 0 (Hex first 32): {data[:32].hex()}")
        ascii_txt = ''.join(chr(b) if 32 <= b < 127 else '.' for b in data[:128])
        print(f"  Sector 0 Text: {ascii_txt}")
        if b"EFI PART" in data:
            print("  [+] GPT Partition Table detected!")
        elif b"NTFS" in data:
            print("  [+] NTFS Boot Sector detected!")
        elif b"XVD" in data:
            print("  [+] XVD Header detected!")
    else:
        print(f"  ReadFile sector 0 failed: {k32.GetLastError()}")
        
    k32.CloseHandle(h)

probe_disk(15)
probe_disk(18)
