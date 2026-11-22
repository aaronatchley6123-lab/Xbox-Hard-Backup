import ctypes
import os

kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi
pids = (ctypes.c_ulong * 1024)()
cbNeeded = ctypes.c_ulong()
if psapi.EnumProcesses(ctypes.byref(pids), ctypes.sizeof(pids), ctypes.byref(cbNeeded)):
    count = cbNeeded.value // ctypes.sizeof(ctypes.c_ulong)
    print(f"Total processes: {count}", flush=True)
    for i in range(count):
        pid = pids[i]
        h = kernel32.OpenProcess(0x0411, False, pid)
        if h:
            buf = ctypes.create_unicode_buffer(1024)
            if psapi.GetProcessImageFileNameW(h, buf, 1024):
                path = buf.value
                if "hermes" in path.lower():
                    print(f"Found target process: PID={pid} Path={path}", flush=True)
                    res = kernel32.TerminateProcess(h, 0)
                    print(f"Terminated PID {pid} result={res}", flush=True)
            kernel32.CloseHandle(h)
