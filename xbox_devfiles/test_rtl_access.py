import ctypes
from ctypes import wintypes

ntdll = ctypes.WinDLL("ntdll.dll")
fn = getattr(ntdll, "RtlAreAllAccessesGranted", None)
if fn:
    fn.argtypes = [wintypes.DWORD, wintypes.DWORD]
    fn.restype = wintypes.BOOLEAN
    
    # Test case 1: Granted has everything desired
    r1 = fn(0x1F0FFF, 0x00020000) # STANDARD_RIGHTS_REQUIRED vs READ_CONTROL
    # Test case 2: Granted misses a bit
    r2 = fn(0x0001, 0x0003)
    # Test case 3: MAXIMUM_ALLOWED (0x02000000) or GENERIC_ALL (0x10000000)
    r3 = fn(0xFFFFFFFF, 0x1F0FFF)
    
    print(f"[+] RtlAreAllAccessesGranted(0x1F0FFF, 0x00020000) = {r1}")
    print(f"[+] RtlAreAllAccessesGranted(0x0001, 0x0003) = {r2}")
    print(f"[+] RtlAreAllAccessesGranted(0xFFFFFFFF, 0x1F0FFF) = {r3}")
else:
    print("[-] RtlAreAllAccessesGranted not found in ntdll.dll")

