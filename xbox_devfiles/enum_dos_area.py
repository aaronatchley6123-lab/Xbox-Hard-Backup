import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL("kernel32.dll", use_last_error=True)

# 1. QueryDosDeviceW
buf = ctypes.create_unicode_buffer(65536)
ret = kernel32.QueryDosDeviceW(None, buf, 65536)
raw = ctypes.wstring_at(buf, ret)
devs = [d for d in raw.split("\x00") if d]
print(f"=== QueryDosDeviceW ({len(devs)} entries) ===")
for d in sorted(devs):
    t = ctypes.create_unicode_buffer(1024)
    kernel32.QueryDosDeviceW(d, t, 1024)
    print(f"  {d:<36} -> {t.value}")

# 2. Direct CreateFileW probe on Xbox/Hypervisor/Storage nodes
candidates = [
    r"\\.\xvmctrl", r"\\.\XVmCtrl", r"\\.\GLOBALROOT\Device\XVmCtrl",
    r"\\.\xsmc", r"\\.\XSmc", r"\\.\GLOBALROOT\Device\xsmc",
    r"\\.\xpal", r"\\.\XPal", r"\\.\GLOBALROOT\Device\xpal",
    r"\\.\xrfs", r"\\.\Xrfs", r"\\.\GLOBALROOT\Device\xrfs",
    r"\\.\xro", r"\\.\XroFilter", r"\\.\GLOBALROOT\Device\XroFilter",
    r"\\.\xvbus", r"\\.\GLOBALROOT\Device\xvbus",
    r"\\.\PhysicalDrive0", r"\\.\PhysicalDrive1", r"\\.\PhysicalDrive2",
    r"\\.\MountPointManager", r"\\.\Nsi", r"\\.\KsecDD",
]
print("\n=== Direct Device Node Probe ===")
for c in candidates:
    h = kernel32.CreateFileW(c, 0, 3, None, 3, 0, None)
    err = ctypes.get_last_error()
    if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
        print(f"  [OPEN OK]      {c} (handle={hex(h)})")
        kernel32.CloseHandle(h)
    else:
        print(f"  [ERR {err:<4}]     {c}")
