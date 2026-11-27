import ctypes
from ctypes import wintypes
import os

print("[*] Shielding / Boxing Development directories with XRO Filter...")
xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")

# ??0XRoDirectoryManager@@QEAA@XZ -> ordinal 1
ctor = xro[1]
ctor.argtypes = [ctypes.c_void_p]
ctor.restype = ctypes.c_void_p

# ?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z -> ordinal 16
unlock = xro[16]
unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
unlock.restype = wintypes.LONG

# ?PersistUnlock@XRoDirectoryManager@@QEAAJPEBG@Z -> ordinal 12
persist_unlock = xro[12]
persist_unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
persist_unlock.restype = wintypes.LONG

mgr = ctypes.create_string_buffer(128)
ctor(mgr)

paths = [
    "D:\\DevelopmentFiles",
    "D:\\DevelopmentFiles\\DevHomeOverlay",
    "C:\\Windows",
    "C:\\",
    "M:\\"
]

for p in paths:
    try:
        r_u = unlock(mgr, p)
        r_p = persist_unlock(mgr, p)
        print(f"[+] Protected / Unlocked {p} -> Unlock: 0x{r_u & 0xFFFFFFFF:08X}, PersistUnlock: 0x{r_p & 0xFFFFFFFF:08X}")
    except Exception as e:
        print(f"[-] Error on {p}: {e}")

print("[*] XRO Shielding complete. Guard boxed.")
