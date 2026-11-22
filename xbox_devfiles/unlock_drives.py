import ctypes
from ctypes import wintypes
import os

xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")
ctor = getattr(xro, "??0XRoDirectoryManager@@QEAA@XZ")
unlock = getattr(xro, "?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z")

ctor.argtypes = [ctypes.c_void_p]
unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
unlock.restype = wintypes.LONG

mgr = ctypes.create_string_buffer(512)
ctor(mgr)

for p in ["C:\\", "C:\\Windows", "M:\\", "M:\\Windows", "M:\\windows", "X:\\", "S:\\"]:
    res = unlock(mgr, p)
    print(f"Unlock {p:15s} -> 0x{res & 0xFFFFFFFF:08X}")
