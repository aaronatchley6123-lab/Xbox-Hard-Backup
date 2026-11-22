import os
import ctypes

print("[*] Testing write and stage capability on M:\\ (System OS Misc)...")

# Try unlocking M:\ via xrofilter
xro_path = r"J:\tools\xrofilter.dll" if os.path.exists(r"J:\tools\xrofilter.dll") else r"D:\DevelopmentFiles\xrofilter.dll"
if os.path.exists(xro_path):
    try:
        xro = ctypes.WinDLL(xro_path)
        ctor = xro[1]
        ctor.argtypes = [ctypes.c_void_p]
        ctor.restype = ctypes.c_void_p
        unlock = xro[16]
        unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
        unlock.restype = ctypes.c_uint32
        mgr = ctypes.create_string_buffer(64)
        ctor(mgr)
        res = unlock(mgr, "M:\\")
        print(f"[+] XRO Unlock M:\\ returned: {res:#010x}")
    except Exception as e:
        print(f"[-] XRO unlock exception: {e}")

# Check write test
test_file = r"M:\windows\DefaultApp\couture_test.txt"
try:
    with open(test_file, "w") as f:
        f.write("COUTURE_OS_STAGE_OK")
    print(f"[🎉 SUCCESS!] Successfully wrote directly to {test_file}!")
    os.remove(test_file)
except Exception as e:
    print(f"[-] Write to M:\\ failed: {e}")

