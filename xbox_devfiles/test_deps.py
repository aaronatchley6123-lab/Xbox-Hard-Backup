import ctypes
import os

k32 = ctypes.windll.kernel32
k32.SetDllDirectoryW(r"D:\Windows11\Windows\System32")
k32.LoadLibraryW.restype = ctypes.c_void_p

deps = [
    r"D:\Windows11\Windows\System32\win32w.dll",
    r"D:\Windows11\Windows\System32\USER3W.dll",
    r"D:\Windows11\Windows\System32\SHLWAPW.dll",
    r"D:\Windows11\Windows\System32\SHELL3W.dll",
    r"D:\Windows11\Windows\System32\dwmapw.dll",
    r"D:\Windows11\Windows\System32\UxThemw.dll",
]

for d in deps:
    fname = os.path.basename(d)
    h = k32.LoadLibraryW(d)
    err = k32.GetLastError()
    print(f"Loading {fname}: handle={hex(h) if h else 0}, err={err}")
