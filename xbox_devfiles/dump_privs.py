import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

advapi32.OpenProcessToken.restype = wintypes.BOOL
advapi32.GetTokenInformation.restype = wintypes.BOOL
advapi32.LookupPrivilegeNameW.restype = wintypes.BOOL

TokenPrivileges = 3

hToken = wintypes.HANDLE()
advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0008, ctypes.byref(hToken))

cb = wintypes.DWORD()
advapi32.GetTokenInformation(hToken, TokenPrivileges, None, 0, ctypes.byref(cb))
buf = ctypes.create_string_buffer(cb.value)
advapi32.GetTokenInformation(hToken, TokenPrivileges, buf, cb.value, ctypes.byref(cb))

# Count is first DWORD
count = ctypes.cast(buf, ctypes.POINTER(wintypes.DWORD)).contents.value
print(f"Token has {count} privileges:")

# Array of LUID_AND_ATTRIBUTES starts at offset 4 (or 8 with alignment on 64-bit)
# In 64-bit C:
# struct TOKEN_PRIVILEGES {
#   DWORD PrivilegeCount;
#   LUID_AND_ATTRIBUTES Privileges[ANYSIZE_ARRAY];
# };
# LUID is 8 bytes (DWORD Low, LONG High). LUID_AND_ATTRIBUTES is 12 bytes (8 + 4).
# In 64-bit struct alignment, after DWORD (4 bytes), there is 4 bytes padding, so Privileges starts at offset 8!

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]

offset = 8
for i in range(count):
    laa = LUID_AND_ATTRIBUTES.from_buffer_copy(buf[offset:offset+12])
    offset += 12 # check alignment
    name_buf = ctypes.create_unicode_buffer(256)
    name_len = wintypes.DWORD(256)
    if advapi32.LookupPrivilegeNameW(None, ctypes.byref(laa.Luid), name_buf, ctypes.byref(name_len)):
        state = "ENABLED" if (laa.Attributes & 2) else ("DISABLED" if (laa.Attributes == 0) else hex(laa.Attributes))
        print(f"  {name_buf.value}: {state}")
    else:
        print(f"  LUID {laa.Luid.LowPart}: Lookup error {kernel32.GetLastError()}")

kernel32.CloseHandle(hToken)
