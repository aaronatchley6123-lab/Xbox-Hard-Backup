import ctypes
from ctypes import wintypes

psapi = ctypes.windll.psapi
kernel32 = ctypes.windll.kernel32

cb = wintypes.DWORD(0)
psapi.EnumDeviceDrivers(None, 0, ctypes.byref(cb))
n_drivers = cb.value // ctypes.sizeof(ctypes.c_void_p)
drivers = (ctypes.c_void_p * n_drivers)()
psapi.EnumDeviceDrivers(drivers, cb, ctypes.byref(cb))

name_buf = ctypes.create_unicode_buffer(512)
all_names = []
for d in drivers:
    if psapi.GetDeviceDriverBaseNameW(d, name_buf, 512):
        all_names.append(name_buf.value)
    elif psapi.GetDeviceDriverFileNameW(d, name_buf, 512):
        all_names.append(name_buf.value)

print(f"Total: {len(all_names)} drivers")
print(", ".join(sorted(all_names)[:40]))
print(", ".join(sorted(all_names)[40:80]))
print(", ".join(sorted(all_names)[80:]))
