import ctypes
from ctypes import wintypes

ntdll = ctypes.windll.ntdll

class UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.USHORT),
        ("MaximumLength", wintypes.USHORT),
        ("Buffer", wintypes.LPWSTR)
    ]

class OBJECT_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.ULONG),
        ("RootDirectory", wintypes.HANDLE),
        ("ObjectName", ctypes.POINTER(UNICODE_STRING)),
        ("Attributes", wintypes.ULONG),
        ("SecurityDescriptor", wintypes.LPVOID),
        ("SecurityQualityOfService", wintypes.LPVOID)
    ]

def make_us(s):
    u = UNICODE_STRING()
    u.Buffer = s
    u.Length = len(s) * 2
    u.MaximumLength = (len(s) + 1) * 2
    return u

h = wintypes.HANDLE()
oa = OBJECT_ATTRIBUTES()
oa.Length = ctypes.sizeof(OBJECT_ATTRIBUTES)
us = make_us(r"\Device\BootDevice")
oa.ObjectName = ctypes.pointer(us)
oa.Attributes = 0x40

status = ntdll.NtOpenSymbolicLinkObject(ctypes.byref(h), 0x0001, ctypes.byref(oa))
print(f"NtOpenSymbolicLinkObject(\\Device\\BootDevice) -> {hex(status & 0xFFFFFFFF)}")
if status == 0:
    target = UNICODE_STRING()
    buf = ctypes.create_unicode_buffer(512)
    target.Buffer = ctypes.cast(buf, wintypes.LPWSTR)
    target.Length = 0
    target.MaximumLength = 1024
    ret_len = wintypes.ULONG(0)
    st = ntdll.NtQuerySymbolicLinkObject(h, ctypes.byref(target), ctypes.byref(ret_len))
    print(f"\\Device\\BootDevice target: {buf.value}")
    ntdll.NtClose(h)
