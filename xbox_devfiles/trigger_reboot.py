import ctypes

print("[*] Triggering native Xbox reboot via xpal.XpalInitiateSystemShutdown...")
xpal = ctypes.WinDLL("xpal.dll")

# XpalInitiateSystemShutdown(DWORD Flags) - Flags: 1 = Reboot, 0 = PowerOff
if hasattr(xpal, "XpalInitiateSystemShutdown"):
    fn = xpal.XpalInitiateSystemShutdown
    fn.restype = ctypes.c_uint32
    res = fn(1)
    print(f"[+] XpalInitiateSystemShutdown(1) res: {res:#x}")
else:
    # Fallback to InitiateSystemShutdownExW
    print("[-] Fallback to Advapi32 InitiateSystemShutdownExW...")
    advapi32 = ctypes.windll.advapi32
    advapi32.InitiateSystemShutdownExW(None, None, 0, True, True, 0x80000000)

