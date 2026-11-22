import ctypes
import os
import struct

print("====================================================")
print("[*] Probing VmType Hypervisor Switch to SysOS...")
print("====================================================")

# In Xbox NanoVisor hypervisor model:
# VmType 0: HostOS / Root
# VmType 1: SystemOS (SysOS / System Partition)
# VmType 2: ERA / Game Title Partition
# VmType 6: Elevated System VM / Factory Tier

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("[-] Failed to open \\\\.\\xvmctrl")
    exit(1)

# Probe switching target to VmType 1 (SysOS) and VmType 6
for target_vm in [1, 6]:
    print(f"\n[*] Signaling Hypervisor VmType switch to: {target_vm}")
    in_buf = ctypes.create_string_buffer(512)
    # Struct format for VMM partition transition:
    # DWORD VmType
    # DWORD Flags (0x8001 = Service/Switch, 0x01 = Activate)
    struct.pack_into("<II", in_buf, 0, target_vm, 0x8001)
    out_buf = ctypes.create_string_buffer(512)
    bytes_ret = ctypes.c_ulong(0)

    # IOCTL_XVM_STATE_SIGNAL (0x0015010C)
    res1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(bytes_ret), None)
    print(f"  IOCTL_XVM_STATE_SIGNAL: {'OK' if res1 else 'FAIL'}")

    # IOCTL_XVM_RESOURCE_BOUNDARY (0x00150178)
    res2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(bytes_ret), None)
    print(f"  IOCTL_XVM_RESOURCE_BOUNDARY: {'OK' if res2 else 'FAIL'}")

ctypes.windll.kernel32.CloseHandle(h)

xpal = ctypes.WinDLL("xpal.dll")
print(f"\n[*] Active XpalGetVmType(): {xpal.XpalGetVmType():#x}")
print("====================================================")
