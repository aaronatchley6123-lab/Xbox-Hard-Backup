import ctypes
import os

k32 = ctypes.windll.kernel32
FILE_ATTRIBUTE_READONLY = 1
FILE_ATTRIBUTE_HIDDEN = 2
FILE_ATTRIBUTE_SYSTEM = 4

for p in [r"D:\unattend.cmd", r"D:\unattend.bat"]:
    if os.path.exists(p):
        ok = k32.SetFileAttributesW(p, FILE_ATTRIBUTE_READONLY | FILE_ATTRIBUTE_SYSTEM)
        attr = k32.GetFileAttributesW(p)
        print(f"[+] Protected: {p} -> Success: {ok}, Attributes: 0x{attr:04X}")
