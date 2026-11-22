import winreg
import ctypes
import struct

print("====================================================")
print("[*] Probing Beyond Retail/Dev Home -> SystemOS / Root / Nanovisor Tier")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

# Inspect exports for internal / system tier
exports_to_test = [
    "XpalGetHostOsInformation",
    "XpalGetTitleOsInformation",
    "XpalQueryTitleVmInfo",
    "XpalIsInternalDevkit",
    "XpalGetCapabilities",
    "XpalGetServerType",
    "XpalGetSystemType"
]

for exp in exports_to_test:
    if hasattr(xpal, exp):
        fn = getattr(xpal, exp)
        try:
            val = fn()
            print(f"  {exp}() -> {val} ({hex(val) if isinstance(val, int) else val})")
        except Exception as e:
            print(f"  {exp}() -> Error: {e}")

# Check XConfig slots above 0x39 for boot/system tier
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
print("\n[*] Scanning Upper XConfig Slots (0x40 to 0x5F)...")
for s in range(0x40, 0x60):
    buf = (ctypes.c_ubyte * 32)()
    ret = ctypes.c_uint32(0)
    res = fn_get(s, buf, 32, ctypes.byref(ret))
    if res == 0 and ret.value > 0:
        raw = bytes(buf[:ret.value])
        print(f"  Slot 0x{s:02X}: {raw.hex()} (len {ret.value})")

