import ctypes
import os
import struct

print("====================================================")
print("[*] Probing Software Mode Transition Signals via \\\\.\\xvmctrl")
print("====================================================")

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

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("[-] Could not open \\\\.\\xvmctrl")
    exit(1)

print(f"[+] Opened \\\\.\\xvmctrl handle: {h:#x}")

# Known xvmctrl IOCTL function codes:
# 0x0015010C: IOCTL_XVM_STATE_SIGNAL
# 0x00150178: IOCTL_XVM_RESOURCE_BOUNDARY
# 0x00150280: IOCTL_XVM_HOLDING_PARTITION
# Let's inspect mode transition signals for targets:
# Mode IDs / VM Types: 1 (SRA), 2 (ERA), 6 (Elevated/Factory)

ioctls = [
    (0x0015010C, "IOCTL_XVM_STATE_SIGNAL"),
    (0x00150178, "IOCTL_XVM_RESOURCE_BOUNDARY"),
    (0x00150280, "IOCTL_XVM_HOLDING_PARTITION")
]

for target_id in [1, 2, 6]:
    print(f"\n[*] Testing signals for Target ID: {target_id}")
    for ioctl_code, name in ioctls:
        in_buf = ctypes.create_string_buffer(512)
        struct.pack_into("<I", in_buf, 0, target_id)
        out_buf = ctypes.create_string_buffer(512)
        bytes_ret = ctypes.c_ulong(0)

        ok = ctypes.windll.kernel32.DeviceIoControl(
            h, ioctl_code, in_buf, ctypes.sizeof(in_buf),
            out_buf, ctypes.sizeof(out_buf), ctypes.byref(bytes_ret), None
        )
        err = ctypes.GetLastError()
        print(f"    {name} (0x{ioctl_code:08X}) -> {'SUCCESS' if ok else f'FAILED (err={err}, {hex(err)})'}")

ctypes.windll.kernel32.CloseHandle(h)

# Re-read xpal capability state to see if any bits updated
xpal = ctypes.WinDLL("xpal.dll")
if hasattr(xpal, "XpalGetConsoleMode"):
    print(f"\n[*] Current XpalGetConsoleMode(): {xpal.XpalGetConsoleMode():#x}")
if hasattr(xpal, "XpalGetVmType"):
    print(f"[*] Current XpalGetVmType(): {xpal.XpalGetVmType():#x}")

print("====================================================")
