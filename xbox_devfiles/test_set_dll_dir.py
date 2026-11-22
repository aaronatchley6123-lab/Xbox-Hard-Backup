import ctypes
import os

kernel32 = ctypes.windll.kernel32

# Set DLL directory to D:\Windows\System32
ok = kernel32.SetDllDirectoryW(r"D:\Windows\System32")
print(f"SetDllDirectoryW(D:\\Windows\\System32): ok={ok}")

# Try loading shell32 now
h = kernel32.LoadLibraryW(r"D:\Windows\System32\shell32.dll")
err = kernel32.GetLastError()
print(f"LoadLibraryW(D:\\Windows\\System32\\shell32.dll): handle={hex(h if h else 0)} err={err}")

if h:
    # Try getting an export that failed earlier
    p = kernel32.GetProcAddress(h, b"SHGetSpecialFolderLocation")
    print(f"SHGetSpecialFolderLocation: {hex(p if p else 0)}")
