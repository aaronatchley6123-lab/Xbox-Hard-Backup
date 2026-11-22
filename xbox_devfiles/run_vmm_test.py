import ctypes
import sys

print("Python version:", sys.version)
print("IsUserAnAdmin:", ctypes.windll.shell32.IsUserAnAdmin())

devices = [
    r"\\.\xvmctrl",
    r"\\.\XVMCTRL",
    r"\\?\xvmctrl",
    r"\\?\XVMCTRL",
    r"\\.\XVmCtrl",
    r"\\.\XVMCtrlDevice",
    r"\\.\DosDevices\Global\XVmCtrl"
]

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 1
FILE_SHARE_WRITE = 2
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

for d in devices:
    h = ctypes.windll.kernel32.CreateFileW(
        d,
        GENERIC_READ | GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None
    )
    err = ctypes.windll.kernel32.GetLastError()
    print(f"Device {d:30s} -> Handle: {h} (LastError: {err})")
    if h != -1 and h != 0:
        print(f"  [+] SUCCESS opening {d}!")
        ctypes.windll.kernel32.CloseHandle(h)

