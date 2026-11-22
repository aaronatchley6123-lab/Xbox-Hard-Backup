import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

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

all_procs = []
sessions = set()

if kernel32.Process32First(hSnap, ctypes.byref(pe)):
    while True:
        sess = wintypes.DWORD()
        kernel32.ProcessIdToSessionId(pe.th32ProcessID, ctypes.byref(sess))
        exe = pe.szExeFile.decode('latin1', errors='ignore')
        sessions.add(sess.value)
        all_procs.append((pe.th32ProcessID, sess.value, exe))
        if not kernel32.Process32Next(hSnap, ctypes.byref(pe)):
            break
kernel32.CloseHandle(hSnap)

print(f"Distinct Sessions found: {sessions}")
print(f"Total processes: {len(all_procs)}")
for pid, s, exe in all_procs:
    print(f"PID: {pid:5d} | Sess: {s} | {exe}")
