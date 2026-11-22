
import ctypes
from ctypes import wintypes

k32 = ctypes.windll.kernel32
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
        ("szExeFile", ctypes.c_char * 260)
    ]

snap = k32.CreateToolhelp32Snapshot(2, 0)
pe = PE()
pe.dwSize = ctypes.sizeof(PE)
ok = k32.Process32First(snap, ctypes.byref(pe))
procs = []
while ok:
    procs.append((pe.th32ProcessID, pe.szExeFile.decode("latin1", errors="ignore")))
    ok = k32.Process32Next(snap, ctypes.byref(pe))
k32.CloseHandle(snap)

for pid, name in procs:
    if any(k in name.lower() for k in ["xbx", "hermes", "python"]):
        print(f"PID {pid:5d}: {name}")
