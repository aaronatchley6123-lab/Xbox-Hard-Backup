import ctypes
import os

print("[*] Probing System Controller & Hardware Interconnects via xpal / kernel...")
xpal = ctypes.WinDLL("xpal.dll")

methods = [
    "XpalGetConsoleMode",
    "XpalGetCapabilities",
    "XpalGetSouthBridgeType",
    "XpalGetServerType",
    "XpalGetSystemType",
    "XpalGetVmType",
    "XpalGetGenerationType"
]

for m in methods:
    if hasattr(xpal, m):
        fn = getattr(xpal, m)
        try:
            val = fn()
            print(f"  {m}() -> {val} (hex: {val:#x})")
        except Exception as e:
            print(f"  {m}() -> ERROR: {e}")

# Check syscon / smbus / uart related exports or drivers in System32
drivers_path = r"C:\Windows\System32\drivers"
syscon_matches = []
try:
    for f in os.listdir(drivers_path):
        lf = f.lower()
        if any(k in lf for k in ["uart", "smbus", "i2c", "syscon", "xsmc", "xsec", "southbridge", "m1034001"]):
            syscon_matches.append(f)
    print(f"[*] Hardware drivers matched: {syscon_matches}")
except Exception as e:
    print(f"[-] Driver enum failed: {e}")

