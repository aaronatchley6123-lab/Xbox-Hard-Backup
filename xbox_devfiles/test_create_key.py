import ctypes
from ctypes import wintypes
import os
import sys

print("[*] Testing RegCreateKeyExW with REG_OPTION_BACKUP_RESTORE and SeRestorePrivilege...")

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

# Enable SeRestorePrivilege and SeBackupPrivilege
h_tok = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(h_tok)):
    for priv in ["SeRestorePrivilege", "SeBackupPrivilege", "SeTakeOwnershipPrivilege"]:
        luid = LUID()
        if advapi32.LookupPrivilegeValueW(None, priv, ctypes.byref(luid)):
            tp = TOKEN_PRIVILEGES()
            tp.PrivilegeCount = 1
            tp.Privileges[0].Luid = luid
            tp.Privileges[0].Attributes = 2
            ok = advapi32.AdjustTokenPrivileges(h_tok, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
            err = kernel32.GetLastError()
            print(f"  [+] Privilege {priv}: ok={ok}, err={err}")
    kernel32.CloseHandle(h_tok)

# RegCreateKeyExW with REG_OPTION_BACKUP_RESTORE (4)
HKEY_LOCAL_MACHINE = ctypes.c_void_p(0x80000002)
KEY_ALL_ACCESS = 0xF003F
REG_OPTION_BACKUP_RESTORE = 0x00000004

h_key = wintypes.HANDLE()
disp = wintypes.DWORD()

ret = advapi32.RegCreateKeyExW(
    HKEY_LOCAL_MACHINE,
    r"OSDATA\XTF\XRO\UnlockedForReboot",
    0,
    None,
    REG_OPTION_BACKUP_RESTORE,
    KEY_ALL_ACCESS,
    None,
    ctypes.byref(h_key),
    ctypes.byref(disp)
)
print(f"[*] RegCreateKeyExW with BACKUP_RESTORE: ret={ret:#x} ({ret})")
if ret == 0:
    print(f"[+] SUCCESS! Key handle: {h_key.value}, disposition={disp.value}")
    advapi32.RegCloseKey(h_key)

    # Now run PersistUnlock
    xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")
    ctor = xro[1]
    ctor.argtypes = [ctypes.c_void_p]
    ctor.restype = ctypes.c_void_p
    persist = xro[12]
    persist.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
    persist.restype = ctypes.c_uint32

    mgr = ctypes.create_string_buffer(256)
    ctor(mgr)
    hr = persist(mgr, r"C:\\")
    print(f"[+] PersistUnlock(C:\\) after key created: hr = 0x{hr:08X}")
