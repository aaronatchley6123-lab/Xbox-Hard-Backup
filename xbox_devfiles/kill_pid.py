import ctypes
import sys

kernel32 = ctypes.windll.kernel32
pid = 6768
h = kernel32.OpenProcess(0x0001, False, pid)
print(f"OpenProcess({pid}): handle={h}")
if h:
    ok = kernel32.TerminateProcess(h, 9)
    print(f"TerminateProcess: {ok} err={kernel32.GetLastError()}")
    kernel32.CloseHandle(h)
else:
    print(f"Failed to open process: err={kernel32.GetLastError()}")
