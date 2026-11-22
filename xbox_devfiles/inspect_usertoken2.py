import ctypes
from ctypes import wintypes

print("=== Probing ext-ms-win-session-usertoken-l1-1-0.dll ===")

k32 = ctypes.windll.kernel32
k32.GetModuleFileNameW.argtypes = [wintypes.HMODULE, wintypes.LPWSTR, wintypes.DWORD]
k32.GetModuleFileNameW.restype = wintypes.DWORD
k32.GetProcAddress.argtypes = [wintypes.HMODULE, ctypes.c_char_p]
k32.GetProcAddress.restype = ctypes.c_void_p

try:
    dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")
    h = wintypes.HMODULE(dll._handle)
    print(f"[+] Loaded successfully! Handle: 0x{dll._handle:X}")
    
    buf = ctypes.create_unicode_buffer(260)
    k32.GetModuleFileNameW(h, buf, 260)
    real_path = buf.value
    print(f"[+] Routed target path: {real_path}")
    
    exports = [
        "WTSQueryUserToken",
        "WTSQuerySessionInformationW",
        "WTSQuerySessionInformationA",
        "WTSGetActiveConsoleSessionId",
        "WTSQueryUserTokenEx",
        "WTSLogoffSession",
        "WTSDisconnectSession",
    ]
    for fn in exports:
        addr = k32.GetProcAddress(h, fn.encode("ascii"))
        if addr:
            print(f"    Export: {fn:<30} -> 0x{addr:X}")
        else:
            print(f"    Export: {fn:<30} -> Not found")
            
except Exception as e:
    print("[-] Error:", e)

