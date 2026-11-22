import ctypes
from ctypes import wintypes

SE_PRIVILEGE_NAMES = [
    "SeDebugPrivilege",
    "SeBackupPrivilege",
    "SeRestorePrivilege",
    "SeTakeOwnershipPrivilege",
    "SeSecurityPrivilege",
    "SeSystemEnvironmentPrivilege",
    "SeManageVolumePrivilege",
    "SeImpersonatePrivilege",
    "SeAssignPrimaryTokenPrivilege",
    "SeLoadDriverPrivilege",
    "SeShutdownPrivilege",
    "SeIncreaseQuotaPrivilege",
]

def enable_all_se_privileges():
    advapi32 = ctypes.windll.advapi32
    kernel32 = ctypes.windll.kernel32

    class LUID(ctypes.Structure):
        _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

    class LUID_AND_ATTRIBUTES(ctypes.Structure):
        _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

    class TOKEN_PRIVILEGES(ctypes.Structure):
        _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

    h_tok = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(h_tok)):
        print(f"[-] OpenProcessToken failed: {kernel32.GetLastError()}")
        return []

    enabled = []
    try:
        for priv_name in SE_PRIVILEGE_NAMES:
            luid = LUID()
            if not advapi32.LookupPrivilegeValueW(None, priv_name, ctypes.byref(luid)):
                continue
            tp = TOKEN_PRIVILEGES()
            tp.PrivilegeCount = 1
            tp.Privileges[0].Luid = luid
            tp.Privileges[0].Attributes = 0x00000002  # SE_PRIVILEGE_ENABLED
            kernel32.SetLastError(0)
            ok = advapi32.AdjustTokenPrivileges(h_tok, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
            err = kernel32.GetLastError()
            if ok and err == 0:
                enabled.append(priv_name)
    finally:
        kernel32.CloseHandle(h_tok)

    print(f"[+] Successfully enabled {len(enabled)} Se* privileges: {enabled}")
    return enabled

if __name__ == "__main__":
    enable_all_se_privileges()
