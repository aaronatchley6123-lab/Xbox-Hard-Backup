import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

DefineDosDeviceW = kernel32.DefineDosDeviceW
DefineDosDeviceW.argtypes = [wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR]
DefineDosDeviceW.restype = wintypes.BOOL

# Map Volume 10 to W: (Crash dumps)
# Map Volume 12 to P: (Delivery Optimization / Update packages)
# Map Volume 17 to I: (Telemetry index)
DefineDosDeviceW(0, "W:", "\\Device\\HarddiskVolume10")
DefineDosDeviceW(0, "P:", "\\Device\\HarddiskVolume12")
DefineDosDeviceW(0, "I:", "\\Device\\HarddiskVolume17")

print("=== Checking Newly Mapped Drives (W:, P:, I:) ===")
for drv in ["W:", "P:", "I:"]:
    try:
        items = os.listdir(drv + "\\")
        print(f"  [+] {drv} -> HarddiskVolume mounted! Items ({len(items)}):", items)
    except Exception as e:
        print(f"  [-] {drv} error: {e}")
