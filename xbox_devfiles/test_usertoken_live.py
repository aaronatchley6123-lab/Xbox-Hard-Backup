import ctypes
from ctypes import wintypes

dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")

# 1. QueryActiveSession
p_active = getattr(dll, "QueryActiveSession", None)
if p_active:
    p_active.argtypes = [ctypes.POINTER(wintypes.DWORD)]
    p_active.restype = wintypes.BOOL
    sess = wintypes.DWORD(0xFFFFFFFF)
    res = p_active(ctypes.byref(sess))
    print(f"[+] QueryActiveSession: res={res}, ActiveSessionId={sess.value}")

# 2. QueryUserToken
p_tok = getattr(dll, "QueryUserToken", None)
if p_tok:
    p_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
    p_tok.restype = wintypes.BOOL
    for sid in [0, 1, sess.value]:
        hToken = wintypes.HANDLE()
        res_tok = p_tok(sid, ctypes.byref(hToken))
        err = ctypes.windll.kernel32.GetLastError()
        print(f"[+] QueryUserToken(Session {sid}): res={res_tok}, hToken={hex(hToken.value or 0)}, Err={err}")

# 3. UMgrGetSessionActiveShellUserToken
p_shell_tok = getattr(dll, "UMgrGetSessionActiveShellUserToken", None)
if p_shell_tok:
    p_shell_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
    p_shell_tok.restype = wintypes.HRESULT
    for sid in [0, 1, sess.value]:
        hToken = wintypes.HANDLE()
        hr = p_shell_tok(sid, ctypes.byref(hToken))
        print(f"[+] UMgrGetSessionActiveShellUserToken(Session {sid}): HRESULT=0x{hr & 0xFFFFFFFF:08X}, hToken={hex(hToken.value or 0)}")

