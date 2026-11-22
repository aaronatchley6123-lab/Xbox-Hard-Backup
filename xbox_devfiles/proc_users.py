import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32

kernel32.OpenProcess.restype = wintypes.HANDLE
advapi32.OpenProcessToken.restype = wintypes.BOOL
advapi32.GetTokenInformation.restype = wintypes.BOOL

TokenUser = 1

def get_process_user(pid):
    hProcess = kernel32.OpenProcess(0x1000, False, pid) # PROCESS_QUERY_LIMITED_INFORMATION
    if not hProcess:
        return f"OpenProcess err: {kernel32.GetLastError()}"
    hToken = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(hProcess, 0x0008, ctypes.byref(hToken)): # TOKEN_QUERY
        kernel32.CloseHandle(hProcess)
        return f"OpenToken err: {kernel32.GetLastError()}"
    
    cb = wintypes.DWORD()
    advapi32.GetTokenInformation(hToken, TokenUser, None, 0, ctypes.byref(cb))
    buf = ctypes.create_string_buffer(cb.value)
    if not advapi32.GetTokenInformation(hToken, TokenUser, buf, cb.value, ctypes.byref(cb)):
        kernel32.CloseHandle(hToken)
        kernel32.CloseHandle(hProcess)
        return f"GetTokenInfo err: {kernel32.GetLastError()}"
    
    # Sid is first pointer in TOKEN_USER struct
    pSid = ctypes.cast(buf, ctypes.POINTER(ctypes.c_void_p)).contents.value
    pStrSid = ctypes.c_wchar_p()
    advapi32.ConvertSidToStringSidW.restype = wintypes.BOOL
    if advapi32.ConvertSidToStringSidW(pSid, ctypes.byref(pStrSid)):
        sid_str = pStrSid.value
        kernel32.LocalFree(pStrSid)
    else:
        sid_str = f"ConvertSid err: {kernel32.GetLastError()}"
        
    kernel32.CloseHandle(hToken)
    kernel32.CloseHandle(hProcess)
    return sid_str

targets = [
    (812, "dwm.exe"),
    (4020, "XboxUI.exe"),
    (4528, "Guide.exe"),
    (4868, "WWAHost.exe"),
    (2832, "HermesUWPApp.exe"),
    (3084, "sshd.exe"),
    (2736, "sihost.exe")
]

for pid, name in targets:
    print(f"{name:20s} (PID {pid:5d}): SID = {get_process_user(pid)}")
