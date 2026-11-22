import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

# Enable Privileges
def enable_privilege(priv_name):
    hToken = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0020 | 0x0008, ctypes.byref(hToken)):
        return False
    
    class LUID(ctypes.Structure):
        _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]
    class LUID_AND_ATTRIBUTES(ctypes.Structure):
        _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]
    class TOKEN_PRIVILEGES(ctypes.Structure):
        _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

    luid = LUID()
    if not advapi32.LookupPrivilegeValueW(None, priv_name, ctypes.byref(luid)):
        kernel32.CloseHandle(hToken)
        return False

    tp = TOKEN_PRIVILEGES()
    tp.PrivilegeCount = 1
    tp.Privileges[0].Luid = luid
    tp.Privileges[0].Attributes = 0x00000002 # SE_PRIVILEGE_ENABLED

    res = advapi32.AdjustTokenPrivileges(hToken, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
    err = kernel32.GetLastError()
    kernel32.CloseHandle(hToken)
    return res != 0 and err == 0

for p in ["SeRestorePrivilege", "SeBackupPrivilege", "SeTakeOwnershipPrivilege", "SeDebugPrivilege"]:
    ok = enable_privilege(p)
    print(f"Privilege {p}: {'ENABLED' if ok else 'FAILED'}")

HKEY_LOCAL_MACHINE = 0x80000002
HKEY_USERS = 0x80000003
REG_OPTION_BACKUP_RESTORE = 0x00000004
KEY_ALL_ACCESS = 0xF003F
REG_SZ = 1
REG_DWORD = 4

def set_val_str(hKey, name, val):
    buf = ctypes.create_unicode_buffer(val)
    advapi32.RegSetValueExW(hKey, name, 0, REG_SZ, ctypes.cast(buf, wintypes.LPBYTE), (len(val) + 1) * 2)

def set_val_dw(hKey, name, val):
    dw = wintypes.DWORD(val)
    advapi32.RegSetValueExW(hKey, name, 0, REG_DWORD, ctypes.cast(ctypes.byref(dw), wintypes.LPBYTE), 4)

def open_and_write(root, subkey):
    hKey = wintypes.HANDLE()
    disposition = wintypes.DWORD()
    ret = advapi32.RegCreateKeyExW(
        root,
        subkey,
        0,
        None,
        REG_OPTION_BACKUP_RESTORE,
        KEY_ALL_ACCESS,
        None,
        ctypes.byref(hKey),
        ctypes.byref(disposition)
    )
    if ret != 0:
        print(f"[-] RegCreateKeyExW for {subkey} failed with code {ret}")
        return False
    set_val_str(hKey, "Shell", r"D:\Windows11\Windows\explorerw.exe")
    set_val_dw(hKey, "DisableClassicDesktop", 0)
    set_val_dw(hKey, "UserMgrLaunchShell", 1)
    advapi32.RegCloseKey(hKey)
    print(f"[+] Successfully wrote shell config to {subkey}")
    return True

# 1. HKLM Winlogon
open_and_write(HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon")

# 2. S-1-5-21-...-503 (DefaultAccount)
open_and_write(HKEY_USERS, r"S-1-5-21-2702878673-795188819-444038987-503\Software\Microsoft\Windows NT\CurrentVersion\Winlogon")

# 3. S-1-5-21-...-1004 (DevToolsUser)
open_and_write(HKEY_USERS, r"S-1-5-21-2702878673-795188819-444038987-1004\Software\Microsoft\Windows NT\CurrentVersion\Winlogon")
