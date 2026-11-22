import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

TOKEN_QUERY = 0x0008
TOKEN_ADJUST_PRIVILEGES = 0x0020

hToken = wintypes.HANDLE()
if advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), TOKEN_QUERY | TOKEN_ADJUST_PRIVILEGES, ctypes.byref(hToken)):
    needed = wintypes.DWORD(0)
    advapi32.GetTokenInformation(hToken, 3, None, 0, ctypes.byref(needed))
    buf = (ctypes.c_byte * needed.value)()
    if advapi32.GetTokenInformation(hToken, 3, buf, needed.value, ctypes.byref(needed)):
        count = ctypes.cast(buf, ctypes.POINTER(wintypes.DWORD)).contents.value
        print(f"Total Token Privileges present: {count}", flush=True)
        # On x64, TOKEN_PRIVILEGES struct has 4 bytes DWORD count + 4 bytes padding, then array of LUID_AND_ATTRIBUTES
        pArray = ctypes.cast(ctypes.byref(buf, 8), ctypes.POINTER(LUID_AND_ATTRIBUTES))
        for i in range(count):
            luid = pArray[i].Luid
            attr = pArray[i].Attributes
            name_len = wintypes.DWORD(256)
            name_buf = ctypes.create_unicode_buffer(256)
            if advapi32.LookupPrivilegeNameW(None, ctypes.byref(luid), name_buf, ctypes.byref(name_len)):
                state = "ENABLED" if (attr & 2) else ("DEFAULT" if (attr & 1) else "DISABLED")
                print(f"  {name_buf.value:<32} [Attr: 0x{attr:08X} - {state}]", flush=True)
    kernel32.CloseHandle(hToken)
