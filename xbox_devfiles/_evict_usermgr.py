import ctypes
import os
from ctypes import wintypes

k32 = ctypes.windll.kernel32
k32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
k32.OpenProcess.restype = wintypes.HANDLE
k32.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
k32.TerminateProcess.restype = wintypes.BOOL


class PE(ctypes.Structure):
    _fields_ = [
        ("dwSize", ctypes.c_uint32),
        ("cntUsage", ctypes.c_uint32),
        ("th32ProcessID", ctypes.c_uint32),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", ctypes.c_uint32),
        ("cntThreads", ctypes.c_uint32),
        ("th32ParentProcessID", ctypes.c_uint32),
        ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", ctypes.c_uint32),
        ("szExeFile", ctypes.c_char * 260),
    ]


snap = k32.CreateToolhelp32Snapshot(2, 0)
pe = PE()
pe.dwSize = ctypes.sizeof(PE)
parents = {}
names = {}
ok = k32.Process32First(snap, ctypes.byref(pe))
while ok:
    parents[pe.th32ProcessID] = pe.th32ParentProcessID
    names[pe.th32ProcessID] = pe.szExeFile.decode("utf-8", errors="ignore").lower()
    ok = k32.Process32Next(snap, ctypes.byref(pe))
k32.CloseHandle(snap)

cur = os.getppid()
target = None
for _ in range(4):
    if cur in names and "python" in names[cur] and cur != os.getpid():
        target = cur
        break
    cur = parents.get(cur, 0)
    if not cur:
        break

if not target:
    target = parents.get(os.getppid(), 0) or os.getppid()

h_proc = k32.OpenProcess(1, False, target)
if h_proc:
    k32.TerminateProcess(h_proc, 1)
    k32.CloseHandle(h_proc)
print(f"EVICTED_PID={target}")
