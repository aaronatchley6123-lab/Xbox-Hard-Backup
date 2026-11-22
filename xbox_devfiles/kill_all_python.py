import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL('kernel32.dll')
psapi = ctypes.WinDLL('psapi.dll')

my_pid = os.getpid()
pids = (wintypes.DWORD * 1024)()
cb_needed = wintypes.DWORD()
psapi.EnumProcesses(pids, ctypes.sizeof(pids), ctypes.byref(cb_needed))
num_pids = cb_needed.value // 4

print(f"My PID is {my_pid}. Searching for other python.exe processes...")
for i in range(num_pids):
    pid = pids[i]
    if pid == my_pid: continue
    h = kernel32.OpenProcess(0x1001, False, pid) # PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION
    if h:
        name_buf = (ctypes.c_wchar * 260)()
        size = wintypes.DWORD(260)
        kernel32.QueryFullProcessImageNameW(h, 0, name_buf, ctypes.byref(size))
        name = name_buf.value
        if "python" in name.lower():
            print(f"Killing old python process PID {pid} ({name})...")
            kernel32.TerminateProcess(h, 0)
        kernel32.CloseHandle(h)

print("All other python processes killed.")
