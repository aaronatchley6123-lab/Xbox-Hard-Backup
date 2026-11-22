import ctypes, subprocess, os, time, socket
from ctypes import wintypes

# Terminate old hermes_bridge.py / desktop_server.py if holding port 1984 or 8080 by creating a fresh bind check or just trying spawn
k32 = ctypes.windll.kernel32
TH32CS_SNAPPROCESS = 0x00000002
class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD), ("szExeFile", wintypes.WCHAR * 260),
    ]
mypid = os.getpid()
hSnap = k32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
pe = PROCESSENTRY32W()
pe.dwSize = ctypes.sizeof(pe)
killed = []
if k32.Process32FirstW(hSnap, ctypes.byref(pe)):
    while True:
        if pe.szExeFile.lower() == "python.exe" and pe.th32ProcessID != mypid:
            hp = k32.OpenProcess(1, False, pe.th32ProcessID)
            if hp:
                k32.TerminateProcess(hp, 0)
                k32.CloseHandle(hp)
                killed.append(pe.th32ProcessID)
        if not k32.Process32NextW(hSnap, ctypes.byref(pe)):
            break
k32.CloseHandle(hSnap)
print("Killed stale python.exe:", killed, flush=True)
time.sleep(0.5)

py = r"D:\DevelopmentFiles\LooseApps\pkg\python.exe"
for script, log in [
    (r"D:\DevelopmentFiles\hermes_bridge.py", r"D:\DevelopmentFiles\bridge_live.log"),
    (r"D:\DevelopmentFiles\desktop_server.py", r"D:\DevelopmentFiles\desktop_server.log"),
]:
    if os.path.exists(script):
        f = open(log, "w")
        p = subprocess.Popen([py, script], stdout=f, stderr=f, creationflags=0x00000008, close_fds=True)
        print("SPAWNED", script, "PID", p.pid, flush=True)

time.sleep(2.5)
for port, payload in [(1984, b"\necho BRIDGE_OK\n---HERMES_END---\n"), (8080, b"GET / HTTP/1.0\r\n\r\n")]:
    try:
        c = socket.create_connection(("127.0.0.1", port), timeout=3)
        c.sendall(payload)
        print(f"[+] 127.0.0.1:{port} ->", repr(c.recv(512)), flush=True)
        c.close()
    except Exception as e:
        print(f"[-] 127.0.0.1:{port} ->", e, flush=True)
