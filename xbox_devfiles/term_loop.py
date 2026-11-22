import ctypes
k32 = ctypes.windll.kernel32
for pid in [3156, 2016]:
    h = k32.OpenProcess(1, False, pid)
    if h:
        k32.TerminateProcess(h, 0)
        k32.CloseHandle(h)
        print('Terminated PID', pid)
