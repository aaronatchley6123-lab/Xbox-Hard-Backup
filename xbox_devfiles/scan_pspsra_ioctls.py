import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3

h = kernel32.CreateFileW(
    r"\\.\pspsra",
    GENERIC_READ | GENERIC_WRITE,
    0,
    None,
    OPEN_EXISTING,
    0,
    None
)

if h != -1 and h != 0:
    print(f"Opened \\\\.\\pspsra successfully (Handle: {hex(h)})")
    
    # Scan standard FILE_DEVICE_UNKNOWN (0x22) IOCTLs in range 0x400 - 0x420
    # Function codes: 0x400 .. 0x420 -> IOCTL = (0x22 << 16) | (func << 2) | method | access
    # 0x22103C: function code = (0x103C >> 2) & 0xFFF = 0x40F
    # 0x221038: function code = (0x1038 >> 2) & 0xFFF = 0x40E
    
    discovered = []
    for func in range(0x400, 0x420):
        for method in [0, 1, 2, 3]:
            ioctl = (0x22 << 16) | (func << 2) | method
            out_buf = ctypes.create_string_buffer(512)
            bytes_ret = wintypes.DWORD()
            
            ok = kernel32.DeviceIoControl(h, ioctl, None, 0, out_buf, 512, ctypes.byref(bytes_ret), None)
            err = kernel32.GetLastError()
            # If err is not ERROR_INVALID_FUNCTION (1) and not ERROR_NOT_SUPPORTED (50)
            if ok or err not in (1, 50, 87):
                discovered.append((hex(ioctl), hex(func), ok, bytes_ret.value, err))

    print(f"Discovered {len(discovered)} active IOCTL endpoints:")
    for d in discovered:
        print(f"  IOCTL {d[0]} (Func {d[1]}): OK={d[2]}, Bytes={d[3]}, Err={d[4]}")
        
    kernel32.CloseHandle(h)
else:
    print("Failed to open pspsra:", kernel32.GetLastError())

