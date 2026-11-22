import ctypes
from ctypes import wintypes

psapi = ctypes.windll.psapi
kernel32 = ctypes.windll.kernel32

cb = wintypes.DWORD(0)
psapi.EnumDeviceDrivers(None, 0, ctypes.byref(cb))
n_drivers = cb.value // ctypes.sizeof(ctypes.c_void_p)
drivers = (ctypes.c_void_p * n_drivers)()
psapi.EnumDeviceDrivers(drivers, cb, ctypes.byref(cb))

print(f"Total kernel drivers loaded: {n_drivers}")
name_buf = ctypes.create_unicode_buffer(512)
win32_drivers = []
for d in drivers:
    if psapi.GetDeviceDriverBaseNameW(d, name_buf, 512):
        name = name_buf.value
        if "win32" in name.lower() or "dxg" in name.lower() or "dcomp" in name.lower():
            win32_drivers.append((name, hex(d or 0)))

print("Graphics & Win32 kernel drivers:")
for name, base in win32_drivers:
    print(f"  {name:25s} @ {base}")
