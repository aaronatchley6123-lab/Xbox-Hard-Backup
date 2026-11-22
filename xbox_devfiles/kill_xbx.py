import ctypes
kernel32 = ctypes.windll.kernel32
h = kernel32.OpenProcess(1, False, 3208)
if h:
    res = kernel32.TerminateProcess(h, 0)
    kernel32.CloseHandle(h)
    print("TerminateProcess(3208) res:", res)
else:
    print("OpenProcess(3208) failed:", kernel32.GetLastError())
