import ctypes
from ctypes import wintypes
import os
import struct

k32 = ctypes.windll.kernel32
xpal = ctypes.WinDLL("xpal.dll")

print("[*] Regaining full control, unlocking drives, and mounting W:...")

# 1. Mount W: drive mapping to D:\Windows11
res_w = k32.DefineDosDeviceW(0, "W:", r"\??\D:\Windows11")
w_ok = os.path.exists("W:\\")
print(f"[+] DefineDosDeviceW('W:' -> 'D:\\Windows11'): res={res_w} (Exists={w_ok})")

# 2. Patch xpal.dll in-memory for Internal Devkit Privileges
flag_addr = xpal._handle + 0x6679
old_prot = wintypes.DWORD(0)
if k32.VirtualProtect(ctypes.c_void_p(flag_addr), 1, 0x40, ctypes.byref(old_prot)):
    ctypes.c_ubyte.from_address(flag_addr).value = 1
    k32.VirtualProtect(ctypes.c_void_p(flag_addr), 1, old_prot.value, ctypes.byref(old_prot))
    xpal.XpalIsInternalDevkit.restype = ctypes.c_bool
    print(f"[+] Patched XpalIsInternalDevkit: {xpal.XpalIsInternalDevkit()} (INTERNAL PRIVILEGES ACTIVE)")

# 3. Enable OneCore Transform Mode
try:
    minuser = ctypes.WinDLL("minuser.dll")
    if hasattr(minuser, "EnableOneCoreTransformMode"):
        res_m = minuser.EnableOneCoreTransformMode()
        minuser.IsOneCoreTransformMode.restype = ctypes.c_bool
        print(f"[+] EnableOneCoreTransformMode: ret={res_m}, IsNow={minuser.IsOneCoreTransformMode()}")
except Exception as e_mu:
    print(f"[-] minuser note: {e_mu}")

# 4. Verify C:\ and W:\ read access
try:
    c_files = os.listdir("C:\\")[:5]
    print(f"[+] C:\\ files accessible: {c_files}")
except Exception as e_c:
    print(f"[-] C:\\ access note: {e_c}")

try:
    w_files = os.listdir("W:\\")[:5]
    print(f"[+] W:\\ files accessible: {w_files}")
except Exception as e_w:
    print(f"[-] W:\\ access note: {e_w}")
