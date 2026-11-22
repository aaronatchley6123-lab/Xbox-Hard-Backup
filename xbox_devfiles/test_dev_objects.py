import ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, POINTER, byref

# Let's find DevGetObjects in cfgmgr32 or devobj or devmgmt
for dll_name in ["cfgmgr32.dll", "devobj.dll", "setupapi.dll", "api-ms-win-devices-query-l1-1-0.dll"]:
    try:
        dll = ctypes.windll.LoadLibrary(dll_name)
        if hasattr(dll, "DevGetObjects"):
            print(f"[+] Found DevGetObjects in {dll_name}!")
        else:
            print(f"[-] DevGetObjects not in {dll_name}")
    except Exception as e:
        print(f"[-] LoadLibrary({dll_name}) error: {e}")
