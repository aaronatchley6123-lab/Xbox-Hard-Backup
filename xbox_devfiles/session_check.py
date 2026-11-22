import ctypes
from ctypes import wintypes
import sys

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

# Enable Privileges
class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]

def enable_privilege(priv_name):
    hToken = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(hToken)):
        return False
    luid = LUID()
    if not advapi32.LookupPrivilegeValueW(None, priv_name, ctypes.byref(luid)):
        kernel32.CloseHandle(hToken)
        return False
    tp = TOKEN_PRIVILEGES()
    tp.PrivilegeCount = 1
    tp.Privileges[0].Luid = luid
    tp.Privileges[0].Attributes = 0x00000002 # SE_PRIVILEGE_ENABLED
    res = advapi32.AdjustTokenPrivileges(hToken, False, ctypes.byref(tp), 0, None, None)
    err = kernel32.GetLastError()
    kernel32.CloseHandle(hToken)
    return res != 0 and err == 0

for p in ["SeDebugPrivilege", "SeBackupPrivilege", "SeRestorePrivilege", "SeTakeOwnershipPrivilege", "SeTcbPrivilege", "SeAssignPrimaryTokenPrivilege", "SeIncreaseQuotaPrivilege"]:
    print(f"Privilege {p}: {enable_privilege(p)}")

# Check processes and sessions
TH32CS_SNAPPROCESS = 0x00000002
class PROCESSENTRY32(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.POINTER(wintypes.ULONG)),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", ctypes.c_char * 260)
    ]

kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
kernel32.Process32First.restype = wintypes.BOOL
kernel32.Process32Next.restype = wintypes.BOOL
kernel32.ProcessIdToSessionId.restype = wintypes.BOOL

hSnap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
pe = PROCESSENTRY32()
pe.dwSize = ctypes.sizeof(PROCESSENTRY32)

print("\n--- Running Processes ---")
if kernel32.Process32First(hSnap, ctypes.byref(pe)):
    while True:
        sess = wintypes.DWORD()
        kernel32.ProcessIdToSessionId(pe.th32ProcessID, ctypes.byref(sess))
        exe = pe.szExeFile.decode('latin1', errors='ignore')
        if sess.value != 0 or 'wwa' in exe.lower() or 'explorer' in exe.lower() or 'winlogon' in exe.lower() or 'csrss' in exe.lower() or 'shell' in exe.lower():
            print(f"PID: {pe.th32ProcessID:5d} | Session: {sess.value} | Exe: {exe}")
        if not kernel32.Process32Next(hSnap, ctypes.byref(pe)):
            break
kernel32.CloseHandle(hSnap)
