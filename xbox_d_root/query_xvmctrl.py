import ctypes
import struct
import sys

kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)

# Constants
GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

# IOCTL code (example)
IOCTL_GET_PARTITION_STATE = 0x00150114

def raise_if_error(ret):
    if not ret:
        err = ctypes.get_last_error()
        raise ctypes.WinError(err)

handle = kernel32.CreateFileW(
    ctypes.c_wchar_p(r"\\.\xvmctrl"),
    GENERIC_READ | GENERIC_WRITE,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    None,
    OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL,
    None
)
raise_if_error(handle != INVALID_HANDLE_VALUE)

input_buffer = None
input_size = 0
output_buffer_size = 1024
output_buffer = ctypes.create_string_buffer(output_buffer_size)
bytes_returned = ctypes.c_ulong()

ret = kernel32.DeviceIoControl(
    handle,
    IOCTL_GET_PARTITION_STATE,
    input_buffer,
    input_size,
    output_buffer,
    output_buffer_size,
    ctypes.byref(bytes_returned),
    None
)
raise_if_error(ret)

data = output_buffer.raw[:bytes_returned.value]
print(f"Returned {bytes_returned.value} bytes")
print("Hex dump:")
print(' '.join(f"{b:02X}" for b in data))

if bytes_returned.value >= 4:
    version, = struct.unpack_from('<I', data, 0)
    print(f"First DWORD interpreted as unsigned int: {version}")

kernel32.CloseHandle(handle)
