import ctypes
import struct

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    GENERIC_READ | GENERIC_WRITE,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    None,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    None
)

if h == -1:
    print("[-] Failed to open \\\\.\\xvmctrl")
    exit(1)

print("[+] Opened \\\\.\\xvmctrl successfully!")

ioctls = [
    (0x00150100, "IOCTL_XVM_FUNC_040_QUERY"),
    (0x0015010C, "IOCTL_XVM_STATE_SIGNAL"),
    (0x00150114, "IOCTL_XVM_HARDWARE_STATS"),
    (0x00150138, "IOCTL_XVM_SHELL_READY"),
    (0x00150160, "IOCTL_XVM_SET_FOCUS"),
    (0x00150164, "IOCTL_XVM_FUNC_059_MEM_STATS"),
    (0x00150178, "IOCTL_XVM_RESOURCE_BOUNDARY"),
    (0x00150280, "IOCTL_XVM_HOLDING_PARTITION"),
    (0x0015028C, "IOCTL_XVM_LAUNCH_ERA"),
    (0x00150298, "IOCTL_XVM_TELEMETRY"),
    (0x0015029C, "IOCTL_XVM_PERF")
]

for code, name in ioctls:
    in_buf = ctypes.create_string_buffer(512)
    struct.pack_into("<I", in_buf, 0, 1) # SRA partition / VmId
    out_buf = ctypes.create_string_buffer(512)
    bytes_ret = ctypes.c_ulong(0)
    
    ok = ctypes.windll.kernel32.DeviceIoControl(
        h,
        code,
        in_buf,
        ctypes.sizeof(in_buf),
        out_buf,
        ctypes.sizeof(out_buf),
        ctypes.byref(bytes_ret),
        None
    )
    if ok:
        print(f"[+] IOCTL 0x{code:08X} ({name}) -> SUCCESS! Bytes returned: {bytes_ret.value}")
        if bytes_ret.value > 0:
            raw = bytes(out_buf[:min(bytes_ret.value, 32)])
            print(f"    Payload hex: {raw.hex()}")
    else:
        err = ctypes.windll.kernel32.GetLastError()
        print(f"[-] IOCTL 0x{code:08X} ({name}) -> Failed: Win32 Error {err}")

ctypes.windll.kernel32.CloseHandle(h)
print("[+] Done querying IOCTLs.")
