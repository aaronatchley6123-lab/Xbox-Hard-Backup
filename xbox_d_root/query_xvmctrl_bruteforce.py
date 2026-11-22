# query_xvmctrl_bruteforce.py – Xbox Series X driver probing
# ------------------------------------------------------------
# This script attempts to open the xvmctrl driver using every
# known device path, then iterates over a set of IOCTL codes (including
# the three discovered in the deep‑dive doc). It dynamically grows the
# output buffer up to 64 MiB, logs each attempt, and writes a plain‑text
# log file to D:\ioctl_bruteforce_log.txt on the console.
# ------------------------------------------------------------
import ctypes
import struct
import os
import sys

# ---------- Windows API ----------
kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

def raise_if_error(ret: bool) -> None:
    """Raise a WinError if the last WinAPI call failed."""
    if not ret:
        err = ctypes.get_last_error()
        raise ctypes.WinError(err)

# ---------- Device paths we have observed ----------
DEVICE_PATHS = [
    r"\\.\\XVmCtrl",
    r"\\.\\xvmctrl",
    r"\\?\\xvmctrl",
    r"\\?\\XVmCtrl",
    r"\\Device\\XVmCtrl",
    r"\\DosDevices\\Global\\XVmCtrl",
]

# ---------- IOCTL codes (hex) ----------
#   • 0x00150114 – example you originally used
#   • 0x15028C   – Launch/Status (deep‑dive)
#   • 0x150138   – Sync (deep‑dive)
#   • 0x150160   – Focus (deep‑dive)
#   • 0x00150200 – placeholder – you can replace with any discovered code
#   • 0x00150300 – placeholder – same as above
IOCTL_CODES = [
    0x00150114,
    0x15028C,
    0x150138,
    0x150160,
    0x00150200,
    0x00150300,
]

# ---------- Logging ----------
LOG_PATH = r"D:\ioctl_bruteforce_log.txt"

def log(msg: str) -> None:
    """Append a line to the log file on the Xbox and also print locally."""
    with open(LOG_PATH, "aa", encoding="utf-8") as f:
        f.write(msg + "\n")
    print(msg)

# ---------- Helper: open driver ----------
def open_device():
    """Return a tuple (handle, used_path) for the first successful device path."""
    for path in DEVICE_PATHS:
        handle = kernel32.CreateFileW(
            ctypes.c_wchar_p(path),
            GENERIC_READ | GENERIC_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None,
        )
        if handle != INVALID_HANDLE_VALUE:
            return handle, path
    return None, None

# ---------- Main probing routine ----------
def main():
    # Ensure we start with a clean log each run
    if os.path.exists(LOG_PATH):
        os.remove(LOG_PATH)

    dev_handle, used_path = open_device()
    if not dev_handle:
        log("❌ No device path succeeded – aborting.")
        sys.exit(1)

    log(f"✅ Opened device via: {used_path}")

    # Iterate over each IOCTL code
    for ioctl in IOCTL_CODES:
        # Start with a moderate buffer; expand on ERROR_INSUFFICIENT_BUFFER
        out_buf_size = 64 * 1024  # 64 KB
        while out_buf_size <= 64 * 1024 * 1024:  # cap at 64 MiB
            out_buf = ctypes.create_string_buffer(out_buf_size)
            bytes_ret = ctypes.c_ulong()
            ret = kernel32.DeviceIoControl(
                dev_handle,
                ioctl,
                None,
                0,
                out_buf,
                out_buf_size,
                ctypes.byref(bytes_ret),
                None,
            )
            if ret:
                data = out_buf.raw[:bytes_ret.value]
                log(f"🚀 IOCTL 0x{ioctl:06X} succeeded – {bytes_ret.value} bytes (buffer {out_buf_size // 1024} KB)")
                # Hex dump of first 64 bytes (or less if data is smaller)
                dump_len = min(64, len(data))
                hex_dump = " ".join(f"{b:02X}" for b in data[:dump_len])
                log(f"Hex dump (first {dump_len} B): {hex_dump}")
                # Quick demo: interpret first DWORD as little‑endian uint32
                if bytes_ret.value >= 4:
                    version, = struct.unpack_from('<I', data, 0)
                    log(f"First DWORD interpreted as uint32: {version}")
                break  # success – move to next IOCTL
            else:
                err = ctypes.get_last_error()
                # 122 = ERROR_INSUFFICIENT_BUFFER – try a larger buffer
                if err == 122:
                    out_buf_size *= 2
                    continue
                log(f"❎ IOCTL 0x{ioctl:06X} failed – WinError {err}")
                break  # stop trying larger buffers for this IOCTL
    # Clean up
    kernel32.CloseHandle(dev_handle)
    log("✅ Probe completed.")

if __name__ == "__main__":
    main()
