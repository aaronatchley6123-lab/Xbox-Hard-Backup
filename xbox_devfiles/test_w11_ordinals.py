import ctypes

k32 = ctypes.windll.kernel32
k32.LoadLibraryExW.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_ulong]
k32.LoadLibraryExW.restype = ctypes.c_void_p
k32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
k32.GetProcAddress.restype = ctypes.c_void_p

# Test loading UxTheme from D:\Windows11\Windows\System32\uxtheme.dll
h_ux = k32.LoadLibraryExW(r"D:\Windows11\Windows\System32\uxtheme.dll", None, 8)
print(f"[*] Load D:\\Windows11 uxtheme.dll: {h_ux} (err={k32.GetLastError()})")
if h_ux:
    p = k32.GetProcAddress(h_ux, ctypes.c_void_p(86))
    print(f"  Ordinal #86 in uxtheme: {p}")

# Test loading SHELL32 from D:\Windows11\Windows\System32\shell32.dll
h_shell = k32.LoadLibraryExW(r"D:\Windows11\Windows\System32\shell32.dll", None, 8)
print(f"[*] Load D:\\Windows11 shell32.dll: {h_shell} (err={k32.GetLastError()})")
if h_shell:
    p = k32.GetProcAddress(h_shell, ctypes.c_void_p(190))
    print(f"  Ordinal #190 in shell32: {p}")
