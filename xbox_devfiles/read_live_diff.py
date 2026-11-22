import subprocess
import json
import ctypes
import struct

print("====================================================")
print("[*] LIVE TELEMETRY STATE CHECK")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

# Read Slot 0x27 & 0x39
buf_27 = (ctypes.c_ubyte * 4)()
ret = ctypes.c_uint32(0)
fn_get(0x27, buf_27, 4, ctypes.byref(ret))
val_27 = struct.unpack("<I", bytes(buf_27[:4]))[0]

buf_39 = (ctypes.c_ubyte * 1)()
fn_get(0x39, buf_39, 1, ctypes.byref(ret))
val_39 = buf_39[0]

mode = xpal.XpalGetConsoleMode()
vm = xpal.XpalGetVmType()
caps = xpal.XpalGetCapabilities()

print(f"[+] NVRAM Slot 0x27:    {val_27} (0x{val_27:02X})")
print(f"[+] NVRAM Slot 0x39:    {val_39} (0x{val_39:02X})")
print(f"[+] ConsoleMode:        0x{mode:02X} ({mode})")
print(f"[+] VmType:             0x{vm:02X} ({vm})")
print(f"[+] Capabilities:       0x{caps:08X}")

# Check wdconfig DefaultApp
res_wd = subprocess.run(["J:\\tools\\wdconfig.exe", "query", "DefaultApp"], capture_output=True, text=True)
print(f"[+] wdconfig DefaultApp: {res_wd.stdout.strip()}")

print("====================================================")
