import ctypes
from ctypes import wintypes

# Open PhysicalDrive0
GENERIC_READ = 0x80000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3

hDisk = ctypes.windll.kernel32.CreateFileW(
    r"\\.\PhysicalDrive0",
    GENERIC_READ,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    None,
    OPEN_EXISTING,
    0,
    None
)
print("PhysicalDrive0 handle:", hex(hDisk & 0xFFFFFFFFFFFFFFFF))

if hDisk != -1 and hDisk != 0:
    # IOCTL_DISK_GET_DRIVE_LAYOUT_EX = 0x00070050
    IOCTL_DISK_GET_DRIVE_LAYOUT_EX = 0x00070050
    buf = (ctypes.c_ubyte * 16384)()
    bytes_returned = wintypes.DWORD(0)
    
    res = ctypes.windll.kernel32.DeviceIoControl(
        hDisk,
        IOCTL_DISK_GET_DRIVE_LAYOUT_EX,
        None,
        0,
        buf,
        len(buf),
        ctypes.byref(bytes_returned),
        None
    )
    print(f"DeviceIoControl IOCTL_DISK_GET_DRIVE_LAYOUT_EX: res={res}, bytes={bytes_returned.value}")
    if res:
        # Parse DRIVE_LAYOUT_INFORMATION_EX
        # DWORD PartitionStyle (0 = MBR, 1 = GPT)
        # DWORD PartitionCount
        import struct
        part_style, part_count = struct.unpack_from("<II", buf, 0)
        print(f"Partition Style: {'GPT' if part_style == 1 else 'MBR'}, Count: {part_count}")
        # PARTITION_INFORMATION_EX starts at offset 48 for GPT
        offset = 48
        for i in range(part_count):
            p_style, start_off, length, part_num, rewrite = struct.unpack_from("<IQQIB", buf, offset)
            # if GPT, read GPT info (type guid, id guid, attributes, name)
            # name is 36 WCHARs (72 bytes) at offset + 56
            name_bytes = bytes(buf[offset+56 : offset+56+72])
            name = name_bytes.decode('utf-16le', errors='ignore').split('\x00')[0]
            print(f"  Part #{part_num:2d}: '{name:<24}' | Offset={start_off//(1024*1024):7d}MB | Size={length//(1024*1024):7d}MB")
            offset += 144
    ctypes.windll.kernel32.CloseHandle(hDisk)
else:
    err = ctypes.windll.kernel32.GetLastError()
    print(f"Open PhysicalDrive0 failed: error {err}")

