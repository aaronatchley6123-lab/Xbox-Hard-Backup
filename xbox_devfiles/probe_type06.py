import ctypes
import os
import struct

print("====================================================")
print("[*] Testing Hypervisor Signal with Target 0x06 / Type 6")
print("====================================================")

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("[-] Failed to open \\\\.\\xvmctrl")
    exit(1)

target = 0x06

# Pass full 512-byte payload with target 0x06
in_buf = ctypes.create_string_buffer(512)
struct.pack_into("<I", in_buf, 0, target)
# Add mode configuration mask in secondary DWORD
struct.pack_into("<I", in_buf, 4, 0x8001) # Service/Elevated flag
out_buf = ctypes.create_string_buffer(512)
ret = ctypes.c_ulong(0)

# Test STATE_SIGNAL (0x0015010C)
ok1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
print(f"[+] IOCTL_XVM_STATE_SIGNAL(0x06, 0x8001): {'SUCCESS' if ok1 else 'FAILED'} (ret={ret.value})")

# Test RESOURCE_BOUNDARY (0x00150178)
ok2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
print(f"[+] IOCTL_XVM_RESOURCE_BOUNDARY(0x06, 0x8001): {'SUCCESS' if ok2 else 'FAILED'} (ret={ret.value})")

# Test HOLDING_PARTITION (0x00150280)
ok3 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
print(f"[+] IOCTL_XVM_HOLDING_PARTITION(0x06, 0x8001): {'SUCCESS' if ok3 else 'FAILED'} (ret={ret.value})")

ctypes.windll.kernel32.CloseHandle(h)

# Check xpal CPUID reflection
xpal = ctypes.WinDLL("xpal.dll")
print(f"[*] Post-Signal XpalGetVmType(): {xpal.XpalGetVmType():#x}")
print(f"[*] Post-Signal XpalGetConsoleMode(): {xpal.XpalGetConsoleMode():#x}")
print(f"[*] Post-Signal XpalGetCapabilities(): {xpal.XpalGetCapabilities():#x}")
print("====================================================")
