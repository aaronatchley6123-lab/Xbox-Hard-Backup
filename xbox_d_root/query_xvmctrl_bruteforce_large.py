import ctypes, os, sys, struct
from ctypes import wintypes

# Constants
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

# Device paths to try (order matters)
DEVICE_PATHS = [
    r"\\\\.\\xvmctrl",
    r"\\\\.\\XVMCTRL",
    r"\\\\?\\xvmctrl",
    r"\\\\?\\XVMCTRL",
    r"\\\\.\\XVmCtrl",   # symbolic link name from driver strings
    r"\\\\.\\DosDevices\\Global\\XVmCtrl",
]


DeviceHandle, used_path = open_device()
if DeviceHandle is None or DeviceHandle == INVALID_HANDLE_VALUE:
    err = ctypes.GetLastError()
    sys.stderr.write(f"Failed to open any device path, error {err}\n")
    sys.exit(1)

# Log which path succeeded
log(f"Opened device via path: {used_path}")
DEVICE_PATH = r"\\\\.\\xvmctrl"  # primary name
ALT_DEVICE_PATH = r"\\\\.\\XVMCTRL"  # fallback uppercase

# IOCTL list (from previous scan)
IOCTL_CODES = [
    0x0015BA00,
    0x00150160,
    0x00150148,
    0x00150130,
    0x0015017C,
    0x001501DC,
    0x001501C8,
    0x0015021C,
    0x00150208,
    0x00150268,
    0x00150254,
    0x00150000,
    0x00157417,
    0x00156422,
    0x0015641E,
    0x0015641B,
    0x00150107,
    0x0015641F,
    0x00150268,  # duplicate keep
    0x00150254,  # duplicate keep
    0x0015021C,  # duplicate keep
    0x15028C,      # Launch/Status (from deep dive)
    0x150138,      # Sync (from deep dive)
    0x150160,      # Focus (from deep dive)
]

# Buffer sizes to try (bytes)
BUFFER_SIZES = [
    64 * 1024,          # 64KB
    256 * 1024,         # 256KB
    1 * 1024 * 1024,    # 1MB
    4 * 1024 * 1024,    # 4MB
    16 * 1024 * 1024,   # 16MB
    64 * 1024 * 1024,   # 64MB
    256 * 1024 * 1024,  # 256MB
    512 * 1024 * 1024,  # 512MB
    655 * 1024 * 1024,  # 655MB
]

# Open device (robust import for XP / Xbox environment)
try:
    kernel32 = ctypes.windll.kernel32
except AttributeError:
    kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
CreateFileW = kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                         wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD,
                         wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE


DeviceHandle, used_path = open_device()
if DeviceHandle is None or DeviceHandle == INVALID_HANDLE_VALUE:
    err = ctypes.GetLastError()
    sys.stderr.write(f"Failed to open any device path, error {err}\n")
    sys.exit(1)

log(f"Opened device via path: {used_path}")

DeviceIoControl = ctypes.windll.kernel32.DeviceIoControl
DeviceIoControl.argtypes = [wintypes.HANDLE, wintypes.DWORD,
                            wintypes.LPVOID, wintypes.DWORD,
                            wintypes.LPVOID, wintypes.DWORD,
                            ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
DeviceIoControl.restype = wintypes.BOOL

log_path = r"D:\\ioctl_bruteforce_log.txt"
log_file = open(log_path, "w", buffering=1)

def log(msg):
    print(msg)
    log_file.write(msg + "\n")

for ioctl in IOCTL_CODES:
    for size in BUFFER_SIZES:
        in_buf = (ctypes.c_ubyte * size)()
        out_buf = (ctypes.c_ubyte * size)()
        bytes_returned = wintypes.DWORD(0)
        success = DeviceIoControl(DeviceHandle, ioctl,
                                 ctypes.byref(in_buf), size,
                                 ctypes.byref(out_buf), size,
                                 ctypes.byref(bytes_returned), None)
        if success:
            data = bytes(out_buf[:bytes_returned.value])
            log(f"IOCTL 0x{ioctl:08X} size {size} succeeded, returned {bytes_returned.value} bytes")
            if bytes_returned.value > 0:
                hex_dump = " ".join(f"{b:02X}" for b in data[:64])
                log(f"  Data (first 64 bytes): {hex_dump}")
        else:
            err = ctypes.GetLastError()
            log(f"IOCTL 0x{ioctl:08X} size {size} failed, error {err}")

log_file.close()
ctypes.windll.kernel32.CloseHandle(DeviceHandle)
