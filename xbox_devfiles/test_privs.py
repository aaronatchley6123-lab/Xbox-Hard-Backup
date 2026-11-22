import ctypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

hProc = kernel32.GetCurrentProcess()
hTok = ctypes.c_void_p()
advapi32.OpenProcessToken(hProc, 0x0008 | 0x0020, ctypes.byref(hTok))

class LUID(ctypes.Structure):
    _fields_ = [("LowPart", ctypes.c_uint32), ("HighPart", ctypes.c_int32)]

class LUID_AND_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("Luid", LUID), ("Attributes", ctypes.c_uint32)]

class TOKEN_PRIVILEGES(ctypes.Structure):
    _fields_ = [("PrivilegeCount", ctypes.c_uint32), ("Privileges", LUID_AND_ATTRIBUTES * 64)]

tp = TOKEN_PRIVILEGES()
ret_len = ctypes.c_uint32()
advapi32.GetTokenInformation(hTok, 3, ctypes.byref(tp), ctypes.sizeof(tp), ctypes.byref(ret_len))

print(f"Token has {tp.PrivilegeCount} privileges:")
for i in range(tp.PrivilegeCount):
    luid = tp.Privileges[i].Luid
    name_buf = (ctypes.c_wchar * 256)()
    name_len = ctypes.c_uint32(256)
    advapi32.LookupPrivilegeNameW(None, ctypes.byref(luid), name_buf, ctypes.byref(name_len))
    attr = tp.Privileges[i].Attributes
    enabled = (attr & 2) != 0
    print(f"  {name_buf.value}: enabled={enabled} (attr=0x{attr:X})")
