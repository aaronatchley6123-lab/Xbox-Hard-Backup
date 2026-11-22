import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

DefineDosDeviceW = kernel32.DefineDosDeviceW
DefineDosDeviceW.argtypes = [wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR]
DefineDosDeviceW.restype = wintypes.BOOL

SetVolumeMountPointW = kernel32.SetVolumeMountPointW
SetVolumeMountPointW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
SetVolumeMountPointW.restype = wintypes.BOOL

print("=== Mounting HarddiskVolume16 to B: ===")
# Try DefineDosDeviceW to \Device\HarddiskVolume16
ok_b = DefineDosDeviceW(0, "B:", "\\Device\\HarddiskVolume16")
if ok_b:
    print("  [+] DefineDosDeviceW B: -> \\Device\\HarddiskVolume16 SUCCEEDED!")
else:
    print(f"  [-] DefineDosDeviceW B: failed: {ctypes.get_last_error()}")

# Try SetVolumeMountPointW
vol_16_guid = "\\\\?\\Volume{83adfffc-0000-0000-0010-000000000000}\\"
ok_mp_b = SetVolumeMountPointW("B:\\", vol_16_guid)
if ok_mp_b:
    print("  [+] SetVolumeMountPointW B:\\ SUCCEEDED!")
else:
    print(f"  [-] SetVolumeMountPointW B:\\ note: {ctypes.get_last_error()}")

print("\n=== Mounting HarddiskVolume19 to Z: ===")
ok_z = DefineDosDeviceW(0, "Z:", "\\Device\\HarddiskVolume19")
if ok_z:
    print("  [+] DefineDosDeviceW Z: -> \\Device\\HarddiskVolume19 SUCCEEDED!")
else:
    print(f"  [-] DefineDosDeviceW Z: failed: {ctypes.get_last_error()}")

vol_19_guid = "\\\\?\\Volume{4bbc1105-0000-0000-0010-000000000000}\\"
ok_mp_z = SetVolumeMountPointW("Z:\\", vol_19_guid)
if ok_mp_z:
    print("  [+] SetVolumeMountPointW Z:\\ SUCCEEDED!")
else:
    print(f"  [-] SetVolumeMountPointW Z:\\ note: {ctypes.get_last_error()}")

print("\n=== Checking Mounted Drives ===")
for drv in ["B:", "Z:"]:
    path = drv + "\\"
    try:
        items = os.listdir(path)
        print(f"  [+] {drv} Mounted & Accessible! Items ({len(items)}):", items[:15])
    except Exception as e:
        print(f"  [-] {drv} os.listdir error: {e}")
