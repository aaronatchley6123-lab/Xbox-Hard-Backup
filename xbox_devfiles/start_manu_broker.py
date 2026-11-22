import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

SC_MANAGER_CONNECT = 0x0001
SC_MANAGER_ENUMERATE_SERVICE = 0x0004
SERVICE_START = 0x0010
SERVICE_QUERY_STATUS = 0x0004

OpenSCManagerW = advapi32.OpenSCManagerW
OpenSCManagerW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD]
OpenSCManagerW.restype = wintypes.HANDLE

OpenServiceW = advapi32.OpenServiceW
OpenServiceW.argtypes = [wintypes.HANDLE, wintypes.LPCWSTR, wintypes.DWORD]
OpenServiceW.restype = wintypes.HANDLE

StartServiceW = advapi32.StartServiceW
StartServiceW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPCWSTR]
StartServiceW.restype = wintypes.BOOL

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

hSCM = OpenSCManagerW(None, None, SC_MANAGER_CONNECT | SC_MANAGER_ENUMERATE_SERVICE)
print(f"[*] OpenSCManager: handle={hex(hSCM or 0)}")

hSvc = OpenServiceW(hSCM, "Manufacturing Broker", SERVICE_START | SERVICE_QUERY_STATUS)
print(f"[*] OpenService('Manufacturing Broker'): handle={hex(hSvc or 0)}")

if not hSvc:
    err = kernel32.GetLastError()
    print(f"[-] Failed to open service: GetLastError={err}")
else:
    status = SERVICE_STATUS()
    QueryServiceStatus(hSvc, ctypes.byref(status))
    print(f"[*] CurrentState before start: {status.dwCurrentState} (1=Stopped, 4=Running)")
    
    ok = StartServiceW(hSvc, 0, None)
    if ok:
        print("[+] StartService returned success!")
    else:
        err = kernel32.GetLastError()
        print(f"[-] StartService failed: GetLastError={err}")
    
    import time
    time.sleep(1)
    QueryServiceStatus(hSvc, ctypes.byref(status))
    print(f"[*] CurrentState after start: {status.dwCurrentState} (ExitCode={status.dwWin32ExitCode})")
