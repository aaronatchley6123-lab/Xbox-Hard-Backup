import ctypes
import os

print("[*] Probing xpal.dll capabilities and console mode...", flush=True)
try:
    xpal = ctypes.WinDLL("xpal.dll")
    
    # XpalGetConsoleMode
    if hasattr(xpal, "XpalGetConsoleMode"):
        f = xpal.XpalGetConsoleMode
        f.restype = ctypes.c_uint32
        print(f"[XPAL] ConsoleMode: 0x{f():08X}")
        
    # XpalGetCapabilities
    if hasattr(xpal, "XpalGetCapabilities"):
        f = xpal.XpalGetCapabilities
        f.restype = ctypes.c_uint32
        caps = f()
        print(f"[XPAL] Capabilities: 0x{caps:08X}")
        
    # XpalIsFeatureEnabled
    if hasattr(xpal, "XpalIsFeatureEnabled"):
        f = xpal.XpalIsFeatureEnabled
        f.argtypes = [ctypes.c_uint32]
        f.restype = ctypes.c_uint32
        for feat in [0, 1, 2, 4, 16, 26, 32, 64]:
            print(f"  Feature {feat:2d}: {f(feat)}")

except Exception as e:
    print(f"[-] XPAL probe error: {e}")
