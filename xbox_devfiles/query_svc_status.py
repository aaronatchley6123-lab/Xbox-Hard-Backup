import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

OpenSCManagerW = advapi32.OpenSCManagerW
OpenSCManagerW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD]
OpenSCManagerW.restype = wintypes.HANDLE

OpenServiceW = advapi32.OpenServiceW
OpenServiceW.argtypes = [wintypes.HANDLE, wintypes.LPCWSTR, wintypes.DWORD]
OpenServiceW.restype = wintypes.HANDLE

class SERVICE_STATUS(ctypes.Structure):
    _fields_ = [
        ('dwServiceType', wintypes.DWORD),
        ('dwCurrentState', wintypes.DWORD),
        ('dwControlsAccepted', wintypes.DWORD),
        ('dwWin32ExitCode', wintypes.DWORD),
        ('dwServiceSpecificExitCode', wintypes.DWORD),
        ('dwCheckPoint', wintypes.DWORD),
        ('dwWaitHint', wintypes.DWORD)
    ]

QueryServiceStatus = advapi32.QueryServiceStatus
QueryServiceStatus.argtypes = [wintypes.HANDLE, ctypes.POINTER(SERVICE_STATUS)]
QueryServiceStatus.restype = wintypes.BOOL

# SC_MANAGER_CONNECT = 0x0001
hSCM = OpenSCManagerW(None, None, 0x0001)

# SERVICE_QUERY_STATUS = 0x0004
for sname in ["Manufacturing Broker", "XboxDevService", "SshdBroker", "sshd"]:
    hSvc = OpenServiceW(hSCM, sname, 0x0004)
    if hSvc:
        st = SERVICE_STATUS()
        QueryServiceStatus(hSvc, ctypes.byref(st))
        state_names = {1: "STOPPED", 2: "START_PENDING", 3: "STOP_PENDING", 4: "RUNNING"}
        print(f"[+] Service '{sname}': State={state_names.get(st.dwCurrentState, st.dwCurrentState)} (ExitCode={st.dwWin32ExitCode})")
    else:
        err = kernel32.GetLastError()
        print(f"[-] Service '{sname}': OpenService failed (err={err})")
