import ctypes
from ctypes import wintypes
import os
import shutil
import sys

print("[*] Testing Copy to C:\\Windows\\System32 via SeRestorePrivilege and Win32 CopyFileExW...")

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

# 1. Enable SeRestorePrivilege, SeBackupPrivilege, SeTakeOwnershipPrivilege
h_tok = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(h_tok)):
    for priv in ["SeRestorePrivilege", "SeBackupPrivilege", "SeTakeOwnershipPrivilege", "SeSecurityPrivilege"]:
        luid = LUID()
        if advapi32.LookupPrivilegeValueW(None, priv, ctypes.byref(luid)):
            tp = TOKEN_PRIVILEGES()
            tp.PrivilegeCount = 1
            tp.Privileges[0].Luid = luid
            tp.Privileges[0].Attributes = 2
            advapi32.AdjustTokenPrivileges(h_tok, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
    kernel32.CloseHandle(h_tok)

# 2. Test copying notepad.exe to C:\Windows\System32\notepad.exe
src = r"D:\Win11\System32\notepad.exe"
dst = r"C:\Windows\System32\notepad.exe"

ok = kernel32.CopyFileW(src, dst, False)
err = kernel32.GetLastError()
print(f"[*] CopyFileW({src} -> {dst}): ok={ok}, err={err}")

# Also test standard shutil.copy
try:
    shutil.copy(src, dst)
    print(f"[+] shutil.copy SUCCESS: {os.path.exists(dst)}")
except Exception as e:
    print(f"[-] shutil.copy error: {e}")
