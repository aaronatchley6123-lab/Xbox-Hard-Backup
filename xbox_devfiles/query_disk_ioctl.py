import ctypes
import struct

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3

IOCTL_DISK_IS_WRITABLE = 0x00070024
IOCTL_DISK_GET_DRIVE_GEOMETRY_EX = 0x00070048

for letter in ["C", "D", "M", "Q"]:
    vol = f"\\\\.\\{letter}:"
    h = ctypes.windll.kernel32.CreateFileW(
        vol,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        0,
        None
    )
    if h == -1:
        err = ctypes.windll.kernel32.GetLastError()
        print(f"Volume {vol:10s} -> CreateFile failed ({err})")
        continue

    bytes_ret = ctypes.c_ulong(0)
    ok = ctypes.windll.kernel32.DeviceIoControl(
        h, IOCTL_DISK_IS_WRITABLE, None, 0, None, 0, ctypes.byref(bytes_ret), None
    )
    err = ctypes.windll.kernel32.GetLastError()
    print(f"Volume {vol:10s} -> IOCTL_DISK_IS_WRITABLE: ok={ok}, LastError={err}")
    ctypes.windll.kernel32.CloseHandle(h)
