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
    # 1. IOCTL 0x22103C
    count_buf = ctypes.create_string_buffer(2)
    bytes_ret = wintypes.DWORD()
    ok1 = kernel32.DeviceIoControl(h, 0x0022103C, None, 0, count_buf, 2, ctypes.byref(bytes_ret), None)
    count = int.from_bytes(count_buf.raw[:2], 'little')
    print(f"IOCTL 0x22103C: OK={ok1}, count={count}")
    
    # 2. IOCTL 0x221038
    data_buf = ctypes.create_string_buffer(0x200)
    ok2 = kernel32.DeviceIoControl(h, 0x00221038, None, 0, data_buf, 0x200, ctypes.byref(bytes_ret), None)
    err = kernel32.GetLastError()
    print(f"IOCTL 0x221038: OK={ok2}, bytes={bytes_ret.value}, err={err}")
    if ok2:
        raw = data_buf.raw[:bytes_ret.value]
        print(f"Data Raw: {raw.hex()}")
        # Unpack as words
        words = [int.from_bytes(raw[i:i+2], 'little') for i in range(0, min(len(raw), count*2), 2)]
        print("Words:", [hex(w) for w in words])
        
    kernel32.CloseHandle(h)
else:
    print(f"CreateFileW failed: {kernel32.GetLastError()}")

