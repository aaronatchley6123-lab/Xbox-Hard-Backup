import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

h = kernel32.CreateFileW(
    r"\\.\pspsra",
    GENERIC_READ | GENERIC_WRITE,
    0,
    None,
    OPEN_EXISTING,
    0,
    None
)

print(f"CreateFileW(\\\\.\\pspsra) Handle: {hex(h)}")
if h != -1 and h != 0:
    IOCTL_PSP_GET_MODE = 0x0022103C
    out_buf = ctypes.create_string_buffer(512)
    bytes_ret = wintypes.DWORD()
    
    ok = kernel32.DeviceIoControl(
        h,
        IOCTL_PSP_GET_MODE,
        None, 0,
        out_buf, 512,
        ctypes.byref(bytes_ret),
        None
    )
    err = kernel32.GetLastError()
    print(f"DeviceIoControl(0x22103C) OK: {ok}, Bytes: {bytes_ret.value}, Err: {err}")
    if ok:
        raw = out_buf.raw[:bytes_ret.value]
        print(f"PSP Mode Raw: {raw.hex()}")
        if len(raw) >= 2:
            mode = int.from_bytes(raw[:2], 'little')
            mode_names = {
                0x0000: "Retail",
                0x2001: "SRA Devkit",
                0x4001: "ERA Devkit",
                0x6001: "MS Devkit",
                0x8001: "SP Devkit"
            }
            print(f"Decoded PSP Hardware Mode: {hex(mode)} -> {mode_names.get(mode, 'UNKNOWN')}")
    kernel32.CloseHandle(h)
else:
    print(f"CreateFileW failed with GetLastError={kernel32.GetLastError()}")

