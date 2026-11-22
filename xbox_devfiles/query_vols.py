import ctypes, string
k32 = ctypes.windll.kernel32
mask = k32.GetLogicalDrives()
drives = [f"{c}:\\" for i, c in enumerate(string.ascii_uppercase) if (mask & (1 << i))]
types = {0:'UNKNOWN', 1:'NO_ROOT', 2:'REMOVABLE (USB)', 3:'FIXED', 4:'REMOTE', 5:'CDROM', 6:'RAMDISK'}
for d in drives:
    dt = k32.GetDriveTypeW(d)
    print(f"Drive {d} -> {types.get(dt, str(dt))}")
