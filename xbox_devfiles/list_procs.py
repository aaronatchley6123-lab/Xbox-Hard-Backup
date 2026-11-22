import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL('kernel32.dll')

pids = (wintypes.DWORD * 1024)()
cb_needed = wintypes.DWORD()
kernel32.K32EnumProcesses(pids, ctypes.sizeof(pids), ctypes.byref(cb_needed))
num_pids = cb_needed.value // 4

print(f"Total processes: {num_pids}")
for i in range(num_pids):
    pid = pids[i]
    h = kernel32.OpenProcess(0x1000, False, pid)
    if h:
        name_buf = (ctypes.c_wchar * 260)()
        size = wintypes.DWORD(260)
        kernel32.QueryFullProcessImageNameW(h, 0, name_buf, ctypes.byref(size))
        name = name_buf.value
        kernel32.CloseHandle(h)
        if any(k in name.lower() for k in ["xbx", "hermes", "app", "d3d", "loose", "devhost"]):
            print(f"PID {pid:5d}: {name}")
