import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL('kernel32.dll')
advapi32 = ctypes.WinDLL('advapi32.dll')

# Enable SeDebugPrivilege
h_tok = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0028, ctypes.byref(h_tok)):
    class LUID(ctypes.Structure): _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]
    class LUID_AND_ATTRIBUTES(ctypes.Structure): _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]
    class TOKEN_PRIVILEGES(ctypes.Structure): _fields_ = [("PrivilegeCount", wintypes.DWORD), ("Privileges", LUID_AND_ATTRIBUTES * 1)]
    luid = LUID()
    if advapi32.LookupPrivilegeValueW(None, "SeDebugPrivilege", ctypes.byref(luid)):
        tp = TOKEN_PRIVILEGES()
        tp.PrivilegeCount = 1
        tp.Privileges[0].Luid = luid
        tp.Privileges[0].Attributes = 2
        advapi32.AdjustTokenPrivileges(h_tok, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)
    kernel32.CloseHandle(h_tok)

pids = (wintypes.DWORD * 1024)()
cb_needed = wintypes.DWORD()
kernel32.K32EnumProcesses(pids, ctypes.sizeof(pids), ctypes.byref(cb_needed))
num_pids = cb_needed.value // 4

print(f"Total processes enumerated: {num_pids}")
for i in range(num_pids):
    pid = pids[i]
    h = kernel32.OpenProcess(0x1000, False, pid)
    if h:
        name_buf = (ctypes.c_wchar * 260)()
        size = wintypes.DWORD(260)
        kernel32.QueryFullProcessImageNameW(h, 0, name_buf, ctypes.byref(size))
        name = name_buf.value
        kernel32.CloseHandle(h)
        if name:
            base = name.split("\\")[-1]
            if not base.lower().startswith("svchost"):
                print(f"PID {pid:5d}: {base} ({name})")
