import ctypes
from ctypes import wintypes

netapi32 = ctypes.windll.netapi32

class USER_INFO_0(ctypes.Structure):
    _fields_ = [("usri0_name", wintypes.LPWSTR)]

buf = ctypes.c_void_p()
entries_read = wintypes.DWORD()
total_entries = wintypes.DWORD()
resume_handle = wintypes.DWORD(0)

status = netapi32.NetUserEnum(
    None, 0, 2, # FILTER_NORMAL_ACCOUNT = 2
    ctypes.byref(buf),
    -1,
    ctypes.byref(entries_read),
    ctypes.byref(total_entries),
    ctypes.byref(resume_handle)
)

print(f"NetUserEnum status: {status}, entries: {entries_read.value}")
if status == 0 and buf.value:
    p = ctypes.cast(buf, ctypes.POINTER(USER_INFO_0))
    for i in range(entries_read.value):
        print(f"User {i}: {p[i].usri0_name}")
    netapi32.NetApiBufferFree(buf)
