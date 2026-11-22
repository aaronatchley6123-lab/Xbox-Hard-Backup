import ctypes
from ctypes import wintypes
import os
import subprocess

xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")
ctor = getattr(xro, "??0XRoDirectoryManager@@QEAA@XZ")
unlock = getattr(xro, "?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z")

ctor.argtypes = [ctypes.c_void_p]
unlock.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
unlock.restype = wintypes.LONG

mgr = ctypes.create_string_buffer(512)
ctor(mgr)

hr = unlock(mgr, "C:\\")
print(f"XRo Unlock C:\\: 0x{hr & 0xFFFFFFFF:08X}")

if hr == 0:
    os.chdir("C:\\")
    # Test xcopy
    cmd = ["xcopy", "D:/DevelopmentFiles/test_xcopy.txt", "C:\\", "/Y"]
    print("Running:", " ".join(cmd))
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print("xcopy stdout:", res.stdout)
    print("xcopy stderr:", res.stderr)
    print("xcopy retcode:", res.returncode)
