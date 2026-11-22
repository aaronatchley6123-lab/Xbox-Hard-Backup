import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
PROCESS_ALL_ACCESS = 0x1FFFFF
PROCESS_VM_READ = 0x0010
PROCESS_QUERY_INFORMATION = 0x0400

for access, name in [(PROCESS_ALL_ACCESS, 'PROCESS_ALL_ACCESS'), (PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, 'VM_READ')]:
    h = kernel32.OpenProcess(access, False, 2896)
    err = kernel32.GetLastError()
    print(f"OpenProcess(2896, {name}) -> handle: {hex(h if h else 0)}, err: {err}")
    if h:
        kernel32.CloseHandle(h)

