import ctypes
from ctypes import wintypes

dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")
advapi32 = ctypes.WinDLL("advapi32.dll")
advapi32.ConvertSidToStringSidW.argtypes = [ctypes.c_void_p, ctypes.POINTER(wintypes.LPWSTR)]
advapi32.ConvertSidToStringSidW.restype = wintypes.BOOL

p_shell_tok = getattr(dll, "UMgrGetSessionActiveShellUserToken")
p_shell_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_shell_tok.restype = ctypes.c_long
hShellToken = wintypes.HANDLE()
hr = p_shell_tok(0, ctypes.byref(hShellToken))
print(f"[+] UMgrGetSessionActiveShellUserToken: hr=0x{hr & 0xFFFFFFFF:08X}, hToken=0x{(hShellToken.value or 0):X}")

class TOKEN_USER(ctypes.Structure):
    _fields_ = [("User_Sid", ctypes.c_void_p), ("User_Attributes", wintypes.DWORD)]

buf = ctypes.create_string_buffer(256)
ret_len = wintypes.DWORD()
ok = advapi32.GetTokenInformation(hShellToken, 1, buf, 256, ctypes.byref(ret_len))
if ok:
    pSid = ctypes.cast(buf, ctypes.POINTER(TOKEN_USER)).contents.User_Sid
    pStrSid = wintypes.LPWSTR()
    advapi32.ConvertSidToStringSidW(pSid, ctypes.byref(pStrSid))
    print(f"[+] Shell User Token SID: {pStrSid.value}")

# Also check QueryUserToken
p_tok = getattr(dll, "QueryUserToken")
p_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_tok.restype = wintypes.BOOL
hToken = wintypes.HANDLE()
p_tok(0, ctypes.byref(hToken))
ok = advapi32.GetTokenInformation(hToken, 1, buf, 256, ctypes.byref(ret_len))
if ok:
    pSid = ctypes.cast(buf, ctypes.POINTER(TOKEN_USER)).contents.User_Sid
    pStrSid = wintypes.LPWSTR()
    advapi32.ConvertSidToStringSidW(pSid, ctypes.byref(pStrSid))
    print(f"[+] QueryUserToken SID: {pStrSid.value}")

