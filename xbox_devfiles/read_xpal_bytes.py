import ctypes
import os

xpal = ctypes.WinDLL("xpal.dll")
handle = xpal._handle
print(f"[+] Loaded xpal handle: {handle:#x}")

# Read first 128 bytes of XpalGetVmType
pFunc = ctypes.cast(getattr(xpal, "XpalGetVmType"), ctypes.c_void_p).value
print(f"[+] XpalGetVmType pointer: {pFunc:#x}")

# Read 32 bytes of machine code
buf = (ctypes.c_ubyte * 32).from_address(pFunc)
hex_code = " ".join(f"{b:02x}" for b in buf)
print(f"[+] XpalGetVmType opcodes: {hex_code}")

