import os, subprocess, time

# 1. Kill old python bridge instances (skip self)
my_pid = os.getpid()
import ctypes
from ctypes import wintypes
TH32CS_SNAPPROCESS = 0x2
class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD), ("th32ProcessID", wintypes.DWORD),
                ("th32DefaultHeapID", ctypes.c_void_p), ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
                ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", wintypes.LONG), ("dwFlags", wintypes.DWORD),
                ("szExeFile", wintypes.WCHAR * 260)]
k32 = ctypes.windll.kernel32
snap = k32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
pe = PROCESSENTRY32W(); pe.dwSize = ctypes.sizeof(pe)
if k32.Process32FirstW(snap, ctypes.byref(pe)):
    while True:
        if pe.szExeFile.lower() == "python.exe" and pe.th32ProcessID != my_pid:
            h = k32.OpenProcess(1, False, pe.th32ProcessID)
            if h:
                k32.TerminateProcess(h, 0)
                k32.CloseHandle(h)
                print("Terminated old python.exe PID", pe.th32ProcessID)
        if not k32.Process32NextW(snap, ctypes.byref(pe)):
            break
k32.CloseHandle(snap)
time.sleep(0.5)

# 2. Spawn new hermes_bridge.py with File-IPC + TCP :1984
for f in [r"D:\DevelopmentFiles\bridge_alive.txt", r"D:\DevelopmentFiles\bridge_req.txt", r"D:\DevelopmentFiles\bridge_res.txt"]:
    try: os.remove(f)
    except: pass

logf = open(r"D:\DevelopmentFiles\hermes_bridge.log", "w")
proc = subprocess.Popen(
    [r"D:\DevelopmentFiles\python\python.exe", r"D:\DevelopmentFiles\hermes_bridge.py"],
    cwd=r"D:\DevelopmentFiles",
    stdout=logf,
    stderr=logf,
    creationflags=0x00000008 | 0x00000200,
    close_fds=True,
)
print("Spawned new hermes_bridge.py PID", proc.pid)
for _ in range(25):
    time.sleep(0.2)
    if os.path.exists(r"D:\DevelopmentFiles\bridge_alive.txt"):
        print("[+] bridge_alive.txt is LIVE!")
        break

# 3. Test File-IPC directly
with open(r"D:\DevelopmentFiles\bridge_req.txt", "w") as rf:
    rf.write("\ncd /d C:\\ && (dir /ad /b 2>nul & echo ---TEST--- & dir /a-d /b 2>nul)\n")
for _ in range(30):
    time.sleep(0.1)
    if os.path.exists(r"D:\DevelopmentFiles\bridge_res.txt"):
        print("[+] File-IPC C:\\ result:", open(r"D:\DevelopmentFiles\bridge_res.txt").read().strip().splitlines()[:6])
        os.remove(r"D:\DevelopmentFiles\bridge_res.txt")
        break
