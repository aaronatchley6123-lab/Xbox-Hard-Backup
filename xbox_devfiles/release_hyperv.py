import ctypes
import struct

print("=" * 60)
print("[*] STEP 1: Reading current Hyper-V Holding Partition state")
print("=" * 60)

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

# Read BEFORE state
for slot, name in [(0x27, "Default VmType"), (0x39, "Secondary VmType Flag")]:
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = fn_get(slot, buf, 64, ctypes.byref(ret))
    if res == 0:
        val = struct.unpack("<I", bytes(buf[:4]))[0] if slot == 0x27 else buf[0]
        print(f"  [BEFORE] Slot 0x{slot:02X} ({name}): {val} (0x{val:02X})")
    else:
        print(f"  [BEFORE] Slot 0x{slot:02X} read error: {res:#x}")

print()
print("=" * 60)
print("[*] STEP 2: Releasing Holding Partition (setting slots to 0)")
print("=" * 60)

# Release IOCTL first
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3

h = ctypes.windll.kernel32.CreateFileW(
    r"\\.\xvmctrl",
    GENERIC_READ | GENERIC_WRITE,
    3, None, OPEN_EXISTING, 0x80, None
)
if h != -1:
    in_buf = ctypes.create_string_buffer(512)
    struct.pack_into("<I", in_buf, 0, 0)
    out_buf = ctypes.create_string_buffer(512)
    ret = ctypes.c_ulong(0)
    ok = ctypes.windll.kernel32.DeviceIoControl(
        h, 0x00150280, in_buf, ctypes.sizeof(in_buf),
        out_buf, ctypes.sizeof(out_buf), ctypes.byref(ret), None
    )
    print(f"  [IOCTL] HOLDING_PARTITION Release (in=0): {'SUCCESS' if ok else 'FAILED'}")
    ctypes.windll.kernel32.CloseHandle(h)
else:
    print("  [IOCTL] Could not open xvmctrl")

# Clear NVRAM slot 0x27 -> 0
buf_clear = (ctypes.c_ubyte * 4)(0, 0, 0, 0)
res27 = fn_set(0x27, buf_clear, 4)
print(f"  [NVRAM] Slot 0x27 set to 0: {'SUCCESS' if res27 == 0 else f'FAILED ({res27:#x})'}")

# Clear NVRAM slot 0x39 -> 0
buf_clear1 = (ctypes.c_ubyte * 1)(0)
res39 = fn_set(0x39, buf_clear1, 1)
print(f"  [NVRAM] Slot 0x39 set to 0: {'SUCCESS' if res39 == 0 else f'FAILED ({res39:#x})'}")

print()
print("=" * 60)
print("[*] STEP 3: Verifying release (reading slots AFTER)")
print("=" * 60)

for slot, name in [(0x27, "Default VmType"), (0x39, "Secondary VmType Flag")]:
    buf = (ctypes.c_ubyte * 64)()
    ret = ctypes.c_uint32(0)
    res = fn_get(slot, buf, 64, ctypes.byref(ret))
    if res == 0:
        val = struct.unpack("<I", bytes(buf[:4]))[0] if slot == 0x27 else buf[0]
        status = "RELEASED" if val == 0 else "STILL ACTIVE"
        print(f"  [AFTER] Slot 0x{slot:02X} ({name}): {val} (0x{val:02X}) -> {status}")
    else:
        print(f"  [AFTER] Slot 0x{slot:02X} read error: {res:#x}")

print()
print("=" * 60)
print("[*] DONE - Hyper-V Holding Partition release complete")
print("=" * 60)
