import ctypes
from ctypes import wintypes

dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")

p_active = getattr(dll, "QueryActiveSession")
p_active.argtypes = [ctypes.POINTER(wintypes.DWORD)]
p_active.restype = wintypes.BOOL
sess = wintypes.DWORD(0xFFFFFFFF)
res = p_active(ctypes.byref(sess))
print(f"[+] QueryActiveSession: res={res}, ActiveSessionId={sess.value}")

p_tok = getattr(dll, "QueryUserToken")
p_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_tok.restype = wintypes.BOOL
hToken = wintypes.HANDLE()
res_tok = p_tok(sess.value, ctypes.byref(hToken))
print(f"[+] QueryUserToken(Session {sess.value}): res={res_tok}, hToken=0x{hToken.value:X}")

p_shell_tok = getattr(dll, "UMgrGetSessionActiveShellUserToken")
p_shell_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_shell_tok.restype = ctypes.c_long
hShellToken = wintypes.HANDLE()
hr = p_shell_tok(sess.value, ctypes.byref(hShellToken))
print(f"[+] UMgrGetSessionActiveShellUserToken(Session {sess.value}): hr=0x{hr & 0xFFFFFFFF:08X}, hToken=0x{(hShellToken.value or 0):X}")

# What user is this token?
advapi32 = ctypes.WinDLL("advapi32.dll")
class TOKEN_USER(ctypes.Structure):
    _fields_ = [("User_Sid", ctypes.c_void_p), ("User_Attributes", wintypes.DWORD)]

buf = ctypes.create_string_buffer(256)
ret_len = wintypes.DWORD()
ok = advapi32.GetTokenInformation(hToken, 1, buf, 256, ctypes.byref(ret_len))
if ok:
    pSid = ctypes.cast(buf, ctypes.POINTER(TOKEN_USER)).contents.User_Sid
    pStrSid = wintypes.LPWSTR()
    advapi32.ConvertSidToStringSidW(pSid, ctypes.byref(pStrSid))
    print(f"[+] Token User SID: {pStrSid.value}")

