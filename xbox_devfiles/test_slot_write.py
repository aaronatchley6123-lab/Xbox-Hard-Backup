import ctypes
import struct

print("====================================================")
print("[*] Testing XConfig Slot 0x27 Write Operation -> Target 6 (Elevated Factory Tier)")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32
fn_set = xpal.XpalSetXConfig
fn_set.restype = ctypes.c_uint32

# 1. Read current value of Slot 0x27
buf = (ctypes.c_ubyte * 64)()
bytes_ret = ctypes.c_uint32(0)
res = fn_get(0x27, buf, 64, ctypes.byref(bytes_ret))
orig_val = struct.unpack("<I", bytes(buf[:4]))[0]
print(f"[+] Current Slot 0x27 Value: {orig_val} (0x{orig_val:02X})")

# 2. Test writing target: 6 (Elevated Factory Tier)
target_val = 6
in_buf = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", target_val))
print(f"[*] Calling XpalSetXConfig(0x27, val={target_val})...")

try:
    set_res = fn_set(0x27, in_buf, 4)
    print(f"[+] XpalSetXConfig Return Code: {set_res:#x}")
except Exception as e:
    print(f"[-] XpalSetXConfig Exception: {e}")

# Also test Slot 0x39
try:
    in_buf_39 = (ctypes.c_ubyte * 1)(target_val)
    set_res_39 = fn_set(0x39, in_buf_39, 1)
    print(f"[+] XpalSetXConfig(0x39, {target_val}) Return Code: {set_res_39:#x}")
except Exception as e:
    print(f"[-] XpalSetXConfig 0x39 Exception: {e}")

# 3. Read back to verify
buf_verify = (ctypes.c_ubyte * 64)()
bytes_verify = ctypes.c_uint32(0)
res2 = fn_get(0x27, buf_verify, 64, ctypes.byref(bytes_verify))
verified_val = struct.unpack("<I", bytes(buf_verify[:4]))[0]
print(f"[+] Post-Write Slot 0x27 Readback: {verified_val} (0x{verified_val:02X})")

if verified_val == target_val:
    print(f"[🎉 SUCCESS!] XConfig Slot 0x27 SUCCESSFULLY UPDATED TO TYPE 6!")
else:
    print(f"[*] Note: Retained {verified_val} (HRESULT: {set_res:#x}).")

print("====================================================")
