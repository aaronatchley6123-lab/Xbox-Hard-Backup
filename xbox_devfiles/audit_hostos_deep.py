import ctypes
import os
import struct

print("====================================================")
print("[*] Deep Interrogation of HostOS (VmId 0 / MinWin Core)")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

# 1. Inspect XpalGetHostOsInformation
# Low 16 bits = OS Build/Type (0x000A = Windows 10/11 OneCore)
# High 16 bits = 0x65F4 (Anaconda Silicon Stepping / Host Root Identifier)
host_info = xpal.XpalGetHostOsInformation()
print(f"[+] XpalGetHostOsInformation: {host_info:#010x}")

# 2. Check HostOS VmId 0 state via \\.\xvmctrl
h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
    print(f"[+] Opened \\\\.\\xvmctrl handle: {h:#x}")
    # Target 0 = HostOS
    in_buf = ctypes.create_string_buffer(512)
    struct.pack_into("<I", in_buf, 0, 0) # VmId 0
    out_buf = ctypes.create_string_buffer(512)
    ret = ctypes.c_ulong(0)

    # 0x0015010C: IOCTL_XVM_STATE_SIGNAL
    ok1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"    IOCTL_XVM_STATE_SIGNAL(HostOS 0) -> {'SUCCESS' if ok1 else 'FAILED'} (ret={ret.value})")

    # 0x00150178: IOCTL_XVM_RESOURCE_BOUNDARY
    ok2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"    IOCTL_XVM_RESOURCE_BOUNDARY(HostOS 0) -> {'SUCCESS' if ok2 else 'FAILED'} (ret={ret.value})")

    # 0x00150280: IOCTL_XVM_HOLDING_PARTITION
    ok3 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"    IOCTL_XVM_HOLDING_PARTITION(HostOS 0) -> {'SUCCESS' if ok3 else 'FAILED'} (ret={ret.value})")

    ctypes.windll.kernel32.CloseHandle(h)

# 3. Check HostOS drives mounted or exposed in DOS devices
kernel32 = ctypes.windll.kernel32
buf_dos = ctypes.create_unicode_buffer(4096)
ret_dos = kernel32.QueryDosDeviceW(None, buf_dos, 4096)
if ret_dos > 0:
    dos_devices = buf_dos[:ret_dos].split('\0')
    host_drives = [d for d in dos_devices if any(k in d.lower() for k in ["host", "minwin", "hv", "vm", "vhd", "xvd", "phys"])]
    print(f"\n[+] Relevant DOS Devices in system ({len(host_drives)} matched):")
    for hd in host_drives[:25]:
        target = ctypes.create_unicode_buffer(512)
        kernel32.QueryDosDeviceW(hd, target, 512)
        print(f"    {hd} -> {target.value}")

