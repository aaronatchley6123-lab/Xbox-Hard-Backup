import ctypes
from ctypes import wintypes

k32 = ctypes.windll.kernel32
k32.GetProcAddress.argtypes = [wintypes.HMODULE, ctypes.c_char_p]
k32.GetProcAddress.restype = ctypes.c_void_p

dll = ctypes.WinDLL("ext-ms-win-session-usertoken-l1-1-0.dll")
h = wintypes.HMODULE(dll._handle)

candidates = [
    "IsInteractiveUserSession",
    "QueryActiveSession",
    "QueryUserToken",
    "RegisterUsertokenForNoWinlogon",
    "UMgrQueryUserToken",
    "UMgrGetSessionActiveShellUserToken",
    "UMgrLaunchShell",
]

print("=== Probing exports through ext-ms-win-session-usertoken-l1-1-0.dll ===")
for name in candidates:
    p = k32.GetProcAddress(h, name.encode("ascii"))
    if p:
        print(f"  [+] {name:<35} -> 0x{p:X}")
    else:
        print(f"  [-] {name:<35} -> None")
