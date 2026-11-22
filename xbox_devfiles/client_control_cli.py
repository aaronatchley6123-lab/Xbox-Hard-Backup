#!/usr/bin/env python
# client_control_cli.py – Command‑line wrapper for VMM client‑control helper (Xbox Series X)
# ---------------------------------------------------------------------------
# This script builds on client_control.py and adds a simple CLI so you can invoke
# the low‑level IOCTL helpers from the command line, e.g.:
#   python client_control_cli.py status
#   python client_control_cli.py launch <app_id>
#   python client_control_cli.py reset
# It also supports a "watch" mode that repeatedly queries the VM status.
# ---------------------------------------------------------------------------
import argparse, sys, time
import ctypes, struct
from ctypes import wintypes

# ---------------------------------------------------------------------------
# Constants (same as client_control.py)
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

# Device paths – order matters, try each until one works
DEVICE_PATHS = [
    r"\\.\\xvmctrl",
    r"\\.\\XVMCTRL",
    r"\\?\\xvmctrl",
    r"\\?\\XVMCTRL",
    r"\\.\\XVmCtrl",          # symbolic link from driver strings
    r"\\.\\DosDevices\\Global\\XVmCtrl",
]

# Load kernel32 functions
kernel32 = ctypes.windll.kernel32
CreateFileW = kernel32.CreateFileW
CreateFileW.argtypes = [
    wintypes.LPCWSTR,  # lpFileName
    wintypes.DWORD,    # dwDesiredAccess
    wintypes.DWORD,    # dwShareMode
    wintypes.LPVOID,   # lpSecurityAttributes
    wintypes.DWORD,    # dwCreationDisposition
    wintypes.DWORD,    # dwFlagsAndAttributes
    wintypes.HANDLE]   # hTemplateFile
CreateFileW.restype = wintypes.HANDLE

DeviceIoControl = kernel32.DeviceIoControl
DeviceIoControl.argtypes = [
    wintypes.HANDLE,   # hDevice
    wintypes.DWORD,    # dwIoControlCode
    wintypes.LPVOID,   # lpInBuffer
    wintypes.DWORD,    # nInBufferSize
    wintypes.LPVOID,   # lpOutBuffer
    wintypes.DWORD,    # nOutBufferSize
    ctypes.POINTER(wintypes.DWORD),  # lpBytesReturned
    wintypes.LPVOID]   # lpOverlapped
DeviceIoControl.restype = wintypes.BOOL

def open_device():
    """Return (handle, path) of the first reachable xvmctrl device."""
    for path in DEVICE_PATHS:
        h = CreateFileW(
            path,
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None)
        if h != INVALID_HANDLE_VALUE:
            return h, path
    return None, None

def send_ioctl(handle, ioctl, in_bytes=None, out_buf_sz=4096):
    """Send a single IOCTL and return (success, out_bytes, error_code)."""
    in_buf = (ctypes.c_ubyte * len(in_bytes))() if in_bytes else None
    if in_bytes:
        ctypes.memmove(in_buf, in_bytes, len(in_bytes))
    out_buf = (ctypes.c_ubyte * out_buf_sz)()
    bytes_ret = wintypes.DWORD(0)
    ok = DeviceIoControl(
        handle,
        ioctl,
        in_buf,
        len(in_bytes) if in_bytes else 0,
        out_buf,
        out_buf_sz,
        ctypes.byref(bytes_ret),
        None)
    err = ctypes.GetLastError()
    out = bytes(out_buf[:bytes_ret.value]) if bytes_ret.value else b""
    return ok, out, err

# ---------------------------------------------------------------------------
# IOCTL constants – replace with the exact values for your driver
IOCTL_STATUS = 0x15028C   # query VM status (example value)
IOCTL_LAUNCH = 0x150138   # launch an app (example value)
IOCTL_RESET = 0x150160    # reset VM (example value)

def query_status(handle):
    ok, out, err = send_ioctl(handle, IOCTL_STATUS)
    if not ok:
        raise RuntimeError(f"Status IOCTL failed, WinError {err}")
    # Assuming the driver returns a 32‑bit status code
    status_code, = struct.unpack('<I', out[:4])
    return status_code

def launch_app(handle, app_id):
    # Payload: UTF‑16LE null‑terminated string
    payload = app_id.encode('utf-16le') + b'\x00\x00'
    ok, _, err = send_ioctl(handle, IOCTL_LAUNCH, payload)
    if not ok:
        raise RuntimeError(f"Launch IOCTL failed, WinError {err}")

def reset_vm(handle):
    ok, _, err = send_ioctl(handle, IOCTL_RESET)
    if not ok:
        raise RuntimeError(f"Reset IOCTL failed, WinError {err}")

# ---------------------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(description="VMM client‑control CLI for Xbox Series X")
    sub = parser.add_subparsers(dest='cmd', required=True)
    sub.add_parser('status', help='Query VM status')
    launch = sub.add_parser('launch', help='Launch an app by its full AppUserModelId')
    launch.add_argument('app_id', help='AppUserModelId, e.g. Microsoft.XboxApp_8wekyb3d8bbwe!App')
    sub.add_parser('reset', help='Reset the VM')
    watch = sub.add_parser('watch', help='Continuously query status')
    watch.add_argument('--interval', type=float, default=2.0, help='Seconds between polls')
    args = parser.parse_args(argv)

    h, path = open_device()
    if not h:
        sys.stderr.write("❌ Could not open any xvmctrl device\n")
        sys.exit(1)
    print(f"✅ Opened {path}")

    try:
        if args.cmd == 'status':
            status = query_status(h)
            print(f"VM status: 0x{status:08x}")
        elif args.cmd == 'launch':
            launch_app(h, args.app_id)
            print(f"✅ Launched {args.app_id}")
        elif args.cmd == 'reset':
            reset_vm(h)
            print("✅ VM reset issued")
        elif args.cmd == 'watch':
            print("🔁 Watching VM status (Ctrl‑C to stop)…")
            while True:
                try:
                    status = query_status(h)
                    print(f"[{time.strftime('%H:%M:%S')}] VM status: 0x{status:08x}")
                except Exception as e:
                    print(f"Error: {e}")
                time.sleep(args.interval)
    finally:
        kernel32.CloseHandle(h)

if __name__ == "__main__":
    main()
