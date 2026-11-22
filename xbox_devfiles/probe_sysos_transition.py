import ctypes
import os
import struct

print("====================================================")
print("[*] Probing SystemOS / Host Partition (VmId 0) Transition")
print("====================================================")

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("[-] Failed to open \\\\.\\xvmctrl")
    exit(1)

# VmId 0 = HostOS / SystemOS root partition
vmid_0 = 0

# 1. Check holding partition state for VmId 0
in_buf = ctypes.create_string_buffer(512)
struct.pack_into("<I", in_buf, 0, vmid_0)
out_buf = ctypes.create_string_buffer(512)
bytes_ret = ctypes.c_ulong(0)

# IOCTL_XVM_STATE_SIGNAL (0x0015010C)
ok1 = ctypes.windll.kernel32.DeviceIoControl(
    h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(bytes_ret), None
)
print(f"[+] IOCTL_XVM_STATE_SIGNAL(VmId 0): {'SUCCESS' if ok1 else 'FAILED'}")

# IOCTL_XVM_RESOURCE_BOUNDARY (0x00150178)
ok2 = ctypes.windll.kernel32.DeviceIoControl(
    h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(bytes_ret), None
)
print(f"[+] IOCTL_XVM_RESOURCE_BOUNDARY(VmId 0): {'SUCCESS' if ok2 else 'FAILED'}")

# IOCTL_XVM_HOLDING_PARTITION (0x00150280)
ok3 = ctypes.windll.kernel32.DeviceIoControl(
    h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(bytes_ret), None
)
print(f"[+] IOCTL_XVM_HOLDING_PARTITION(VmId 0): {'SUCCESS' if ok3 else 'FAILED'}")

ctypes.windll.kernel32.CloseHandle(h)

# Check sracmd focus transition to VmId 0
import subprocess
try:
    res = subprocess.run(["sracmd.exe", "-SetFocus", "0"], capture_output=True, text=True)
    print(f"[*] sracmd -SetFocus 0 stdout:\n{res.stdout}")
    if res.stderr:
        print(f"[-] sracmd -SetFocus 0 stderr:\n{res.stderr}")
except Exception as e:
    print(f"[-] SetFocus error: {e}")

print("====================================================")
