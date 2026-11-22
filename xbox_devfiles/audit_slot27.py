import ctypes
import struct

print("====================================================")
print("[*] Interrogating XConfig Slot 0x27 & Slot 0x39 (VmType Config)")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

# Read Slot 0x27
buf_27 = (ctypes.c_ubyte * 64)()
ret_27 = ctypes.c_uint32(0)
res_27 = fn_get(0x27, buf_27, 64, ctypes.byref(ret_27))
if res_27 == 0:
    val_27 = struct.unpack("<I", bytes(buf_27[:4]))[0]
    print(f"[+] Slot 0x27 (Default VmType): {val_27} (0x{val_27:02X}) | Raw: {bytes(buf_27[:ret_27.value]).hex()}")
else:
    print(f"[-] Error reading 0x27: {res_27:#x}")

# Read Slot 0x39
buf_39 = (ctypes.c_ubyte * 64)()
ret_39 = ctypes.c_uint32(0)
res_39 = fn_get(0x39, buf_39, 64, ctypes.byref(ret_39))
if res_39 == 0:
    val_39 = buf_39[0]
    print(f"[+] Slot 0x39 (Secondary VmType Flag): {val_39} (0x{val_39:02X}) | Raw: {bytes(buf_39[:ret_39.value]).hex()}")
else:
    print(f"[-] Error reading 0x39: {res_39:#x}")

# Check signature and availability of XpalSetXConfig
if hasattr(xpal, "XpalSetXConfig"):
    print("[+] XpalSetXConfig function pointer present at: 0x%x" % ctypes.cast(xpal.XpalSetXConfig, ctypes.c_void_p).value)
    
print("====================================================")
