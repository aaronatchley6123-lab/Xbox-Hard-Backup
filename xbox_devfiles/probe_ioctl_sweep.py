import ctypes
import os
import struct

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("Failed to open xvmctrl")
    exit(1)

print("[*] Probing xvmctrl IOCTL function ranges...")
successes = []

# Scan common Xbox VMM IOCTL function codes (Facility 0x15 = 21, FILE_DEVICE_UNKNOWN = 0x22, etc.)
# 0x00150000 to 0x00150400 in steps of 4
for func in range(0x40, 0x100):
    code = (0x15 << 16) | (0 << 14) | (func << 2) | 0
    in_buf = ctypes.create_string_buffer(512)
    struct.pack_into("<I", in_buf, 0, 6) # Target 6
    out_buf = ctypes.create_string_buffer(512)
    ret = ctypes.c_ulong(0)
    ok = ctypes.windll.kernel32.DeviceIoControl(h, code, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    if ok:
        successes.append((hex(code), hex(func), ret.value))

ctypes.windll.kernel32.CloseHandle(h)
print(f"[+] Active IOCTLs found ({len(successes)}):")
for s in successes:
    print(f"    Code: {s[0]} (Function: {s[1]}), bytes returned: {s[2]}")

