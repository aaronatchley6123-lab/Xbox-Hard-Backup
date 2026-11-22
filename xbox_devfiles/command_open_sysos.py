import ctypes
import struct

print("====================================================")
print("[*] Commanding Hypervisor to Transition / Open SysOS")
print("====================================================")

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h == -1 or h == 0xFFFFFFFFFFFFFFFF:
    print("[-] Failed to open \\\\.\\xvmctrl")
    exit(1)

# Target VmId 1 (SysOS) and VmId 0 (Host / Root)
# Command codes for partition activation:
# 0x0015010C: IOCTL_XVM_STATE_SIGNAL
# 0x00150178: IOCTL_XVM_RESOURCE_BOUNDARY
# 0x00150280: IOCTL_XVM_HOLDING_PARTITION

# Payload:
# DWORD 0: Target VmId (1 = SysOS)
# DWORD 1: Action (0x01 = ACTIVATE / RUN, 0x8001 = ELEVATED_SYSOS)
# DWORD 2: Flags (0x02 = ATTACH_DISPLAY)

in_payload = struct.pack("<III", 1, 0x8001, 0x02) + b"\x00" * 500
in_buf = ctypes.create_string_buffer(in_payload)
out_buf = ctypes.create_string_buffer(512)
ret = ctypes.c_ulong(0)

# Dispatch State Signal to SysOS
ok1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
print(f"[+] IOCTL_XVM_STATE_SIGNAL (SysOS Activate) -> {'SUCCESS' if ok1 else 'FAILED'} (ret={ret.value})")

# Dispatch Resource Boundary to SysOS
ok2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
print(f"[+] IOCTL_XVM_RESOURCE_BOUNDARY (SysOS Attach) -> {'SUCCESS' if ok2 else 'FAILED'} (ret={ret.value})")

ctypes.windll.kernel32.CloseHandle(h)

# Now tell sracmd to focus the display compositor onto the System Partition
import subprocess
print("\n[*] Invoking sracmd to hand off display focus...")
cmd_focus = ["sracmd.exe", "-SetFocus", "0"] # Host/System Partition
res = subprocess.run(cmd_focus, capture_output=True, text=True)
print(f"  sracmd -SetFocus 0 stdout:\n{res.stdout}")
if res.stderr:
    print(f"  sracmd -SetFocus 0 stderr:\n{res.stderr}")

print("====================================================")
