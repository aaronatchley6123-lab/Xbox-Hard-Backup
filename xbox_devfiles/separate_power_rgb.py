import ctypes
from ctypes import wintypes
import struct
import os

kernel32 = ctypes.windll.kernel32
DeviceIoControl = kernel32.DeviceIoControl
DeviceIoControl.argtypes = [
    wintypes.HANDLE,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    wintypes.LPVOID,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    wintypes.LPVOID,
]
DeviceIoControl.restype = wintypes.BOOL

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2

IOCTL_POWER = 0x00150130               # POWER_04C
IOCTL_RGB   = 0x00150178               # IOCTL_XVM_RESOURCE_BOUNDARY (RGB)
IOCTL_HOLDING_PARTITION = 0x00150280

def send_io(vmid, target_name):
    print(f"\n==========================================")
    print(f"[*] Executing POWER + RGB for {target_name} (VmId={vmid})")
    print(f"==========================================")
    h = kernel32.CreateFileW(
        r"\\.\xvmctrl",
        GENERIC_READ | GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        0x80,
        None
    )
    if h == -1 or not h:
        print(f"[-] Failed to open \\\\.\\xvmctrl (err={kernel32.GetLastError()})")
        return False

    in_buf = ctypes.create_string_buffer(8)
    struct.pack_into("<II", in_buf, 0, vmid, 0)
    out_buf = ctypes.create_string_buffer(256)
    bytes_ret = wintypes.DWORD(0)

    # 1. POWER IOCTL
    ok_pwr = DeviceIoControl(h, IOCTL_POWER, in_buf, 8, out_buf, 256, ctypes.byref(bytes_ret), None)
    err_pwr = 0 if ok_pwr else kernel32.GetLastError()
    print(f"  [1] POWER (0x{IOCTL_POWER:08X}) -> {'OK' if ok_pwr else f'ERR={err_pwr}'} ({bytes_ret.value}B)")

    # 2. RGB (Resource Boundary) IOCTL
    bytes_ret.value = 0
    ok_rgb = DeviceIoControl(h, IOCTL_RGB, in_buf, 8, out_buf, 256, ctypes.byref(bytes_ret), None)
    err_rgb = 0 if ok_rgb else kernel32.GetLastError()
    print(f"  [2] RGB (0x{IOCTL_RGB:08X})   -> {'OK' if ok_rgb else f'ERR={err_rgb}'} ({bytes_ret.value}B)")

    kernel32.CloseHandle(h)
    return ok_pwr and ok_rgb

import sys
choice = sys.argv[1].upper() if len(sys.argv) > 1 else "C"

if choice == "C":
    send_io(1, "Drive C: (System Boot)")
elif choice == "M":
    send_io(2, "Drive M: (System Misc)")
elif choice == "0":
    send_io(0, "Drive / VmId 0")
else:
    print(f"Unknown target: {choice}")
