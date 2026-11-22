import ctypes
from ctypes import wintypes
import sys

pid = int(sys.argv[1]) if len(sys.argv) > 1 else 2476
kernel32 = ctypes.WinDLL('kernel32.dll')
h = kernel32.OpenProcess(0x1000, False, pid)
if h:
    exit_code = wintypes.DWORD()
    kernel32.GetExitCodeProcess(h, ctypes.byref(exit_code))
    code = exit_code.value
    if code == 259:
        print(f"PID {pid} is STILL RUNNING (STILL_ACTIVE = 259)!")
    else:
        print(f"PID {pid} has terminated with exit code: {code}")
    kernel32.CloseHandle(h)
else:
    print(f"Could not open PID {pid}, error: {kernel32.GetLastError()}")
