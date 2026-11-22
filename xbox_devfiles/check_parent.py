
import ctypes
from ctypes import wintypes
k32 = ctypes.windll.kernel32
class PE(ctypes.Structure):
    _fields_ = [('dwSize', wintypes.DWORD), ('cntUsage', wintypes.DWORD), ('th32ProcessID', wintypes.DWORD), ('th32DefaultHeapID', ctypes.c_void_p), ('th32ModuleID', wintypes.DWORD), ('cntThreads', wintypes.DWORD), ('th32ParentProcessID', wintypes.DWORD), ('pcPriClassBase', wintypes.LONG), ('dwFlags', wintypes.DWORD), ('szExeFile', wintypes.WCHAR * 260)]
h = k32.CreateToolhelp32Snapshot(2, 0)
pe = PE(); pe.dwSize = ctypes.sizeof(PE)
procs = {}
if k32.Process32FirstW(h, ctypes.byref(pe)):
    while True:
        procs[pe.th32ProcessID] = (pe.szExeFile, pe.th32ParentProcessID)
        if not k32.Process32NextW(h, ctypes.byref(pe)): break
k32.CloseHandle(h)
for pid, (name, parent) in procs.items():
    if any(k in name.lower() for k in ['default', 'hermes', 'xboxui', 'guide']):
        pname = procs.get(parent, ('UNKNOWN', 0))[0]
        print(f'{name} (PID {pid}) -> Parent: {pname} (PID {parent})')
