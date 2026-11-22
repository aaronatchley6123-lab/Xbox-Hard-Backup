import ctypes

k32 = ctypes.windll.kernel32
k32.SetDllDirectoryW(r"D:\Windows11\Windows\System32")
k32.LoadLibraryW.restype = ctypes.c_void_p

h = k32.LoadLibraryW(r"D:\Windows11\Windows\System32\ExplorerFrame.dll")
err = k32.GetLastError()
print(f"ExplorerFrame.dll handle: {hex(h) if h else 0}, err: {err}")
