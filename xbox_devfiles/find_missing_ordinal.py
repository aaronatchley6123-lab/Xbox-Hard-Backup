import ctypes
import os

kernel32 = ctypes.windll.kernel32
LOAD_WITH_ALTERED_SEARCH_PATH = 0x00000008

test_dlls = [
    "msvcp_win.dll", "ucrtbase.dll", "USER32.dll", "GDI32.dll", 
    "SHELL32.dll", "SHCORE.dll", "combase.dll", "twinui.dll", 
    "dcomp.dll", "uxtheme.dll", "windows.storage.dll"
]

print("Testing DLL loads against live system / D:\\Windows\\System32:")
for dll in test_dlls:
    path = os.path.join(r"D:\Windows\System32", dll)
    h = kernel32.LoadLibraryExW(path, None, LOAD_WITH_ALTERED_SEARCH_PATH)
    err = kernel32.GetLastError()
    print(f"  {dll:25s} -> Handle: {hex(h if h else 0)} Error: {err}")
