import ctypes
import os

print("=== Probing ext-ms-win-session-usertoken-l1-1-0.dll ===")
try:
    dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")
    print(f"[+] Loaded successfully! Handle: 0x{dll._handle:X}")
    
    # Let's inspect exports by getting module file name or checking known functions
    buf = (ctypes.c_wchar * 260)()
    ctypes.windll.kernel32.GetModuleFileNameW(dll._handle, buf, 260)
    real_path = buf.value
    print(f"[+] Routed target path: {real_path}")
    
    # Check known user token exports
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
        addr = ctypes.windll.kernel32.GetProcAddress(dll._handle, fn.encode("ascii"))
        if addr:
            print(f"    Export: {fn:<30} -> 0x{addr:X}")
        else:
            print(f"    Export: {fn:<30} -> Not found")
            
except Exception as e:
    print("[-] Error loading DLL:", e)

