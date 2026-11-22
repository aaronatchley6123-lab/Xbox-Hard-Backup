import ctypes, os, sys

print("Setting PATH...")
os.environ['PATH'] = r'D:\Windows11\Windows\System32;D:\Windows11\Windows;' + os.environ.get('PATH', '')

try:
    print("Loading USER3W.dll...")
    h_user = ctypes.WinDLL(r'D:\Windows11\Windows\System32\USER3W.dll')
    print("USER3W loaded:", hex(h_user._handle))

    print("Loading SHELL3W.dll...")
    h_shell = ctypes.WinDLL(r'D:\Windows11\Windows\System32\SHELL3W.dll')
    print("SHELL3W loaded:", hex(h_shell._handle))

    ord200 = h_shell[200]
    ord200.restype = ctypes.c_void_p
    ord200.argtypes = [ctypes.c_void_p]

    buf = (ctypes.c_byte * 1024)()
    print("Calling Ordinal 200 (SHCreateDesktop)...")
    res = ord200(ctypes.byref(buf))
    print(f"Ordinal 200 returned: {hex(res if res else 0)}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

