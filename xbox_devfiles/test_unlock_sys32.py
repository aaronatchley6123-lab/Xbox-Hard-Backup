import ctypes
import os

xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")
ctor = xro[1]
ctor.argtypes = [ctypes.c_void_p]
ctor.restype = ctypes.c_void_p

unlock = xro[16]
unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
unlock.restype = ctypes.c_uint32

persist_unlock = xro[12]
persist_unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
persist_unlock.restype = ctypes.c_uint32

mgr = ctypes.create_string_buffer(256)
ctor(mgr)

for target in [r"C:\Windows\System32", r"C:\Windows"]:
    hr1 = unlock(mgr, target)
    hr2 = persist_unlock(mgr, target)
    print(f"Unlock({target}): hr=0x{hr1:08X}, PersistUnlock: hr=0x{hr2:08X}")

# Test creating a file in C:\Windows\System32
test_file = r"C:\Windows\System32\test_write.tmp"
try:
    with open(test_file, "w") as f:
        f.write("test")
    os.remove(test_file)
    print("[+] Successfully wrote and deleted test file in C:\\Windows\\System32!")
except Exception as e:
    print(f"[-] Write to C:\\Windows\\System32 failed: {e}")
