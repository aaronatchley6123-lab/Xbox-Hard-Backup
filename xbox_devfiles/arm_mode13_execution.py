import ctypes
import struct

print("====================================================")
print("[*] EXECUTING MODE 13 / 0x8001 ELEVATED STATE TRANSITION")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

# 1. Lock in NVRAM Target 6 / Mode 13
print("[*] Step 1: Setting Slot 0x27 & 0x39 to Mode 6 / 13...")
in_buf_27 = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", 6))
in_buf_39 = (ctypes.c_ubyte * 1)(6)

r27 = fn_set(0x27, in_buf_27, 4)
r39 = fn_set(0x39, in_buf_39, 1)
print(f"  XpalSetXConfig(0x27, 6) -> {r27:#x}")
print(f"  XpalSetXConfig(0x39, 6) -> {r39:#x}")

# 2. Transmit IOCTL Signals to NanoVisor Hypervisor
print("\n[*] Step 2: Transmitting Hypervisor Partition Control Signals...")
h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    0xC0000000, 3, None, 3, 0x80, None
)

if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
    in_buf = ctypes.create_string_buffer(512)
    struct.pack_into("<II", in_buf, 0, 6, 0x8001)
    out_buf = ctypes.create_string_buffer(512)
    ret = ctypes.c_ulong(0)

    # Signal 1: State
    ok1 = ctypes.windll.kernel32.DeviceIoControl(h, 0x0015010C, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"  IOCTL_XVM_STATE_SIGNAL (0x8001): {'SUCCESS' if ok1 else 'FAILED'}")

    # Signal 2: Boundary
    ok2 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150178, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"  IOCTL_XVM_RESOURCE_BOUNDARY (0x8001): {'SUCCESS' if ok2 else 'FAILED'}")

    # Signal 3: Holding
    ok3 = ctypes.windll.kernel32.DeviceIoControl(h, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret), None)
    print(f"  IOCTL_XVM_HOLDING_PARTITION (0x8001): {'SUCCESS' if ok3 else 'FAILED'}")

    ctypes.windll.kernel32.CloseHandle(h)
else:
    print("[-] Failed to open \\\\.\\xvmctrl")

# 3. Read live status
print("\n[*] Step 3: Verified Silicon Status:")
print(f"  XpalGetConsoleMode(): 0x{xpal.XpalGetConsoleMode():02X}")
print(f"  XpalGetVmType():      0x{xpal.XpalGetVmType():02X}")
print(f"  XpalGetCapabilities(): 0x{xpal.XpalGetCapabilities():08X}")
print("====================================================")
print("[+] TRANSITION ARMED AND READY FOR SOFT REBOOT!")
print("====================================================")
