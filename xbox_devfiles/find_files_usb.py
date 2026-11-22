
import ctypes
from ctypes import wintypes, Structure, POINTER, byref

class WIN32_FIND_DATAW(Structure):
    _fields_ = [
        ('dwFileAttributes', wintypes.DWORD),
        ('ftCreationTime', wintypes.FILETIME),
        ('ftLastAccessTime', wintypes.FILETIME),
        ('ftLastWriteTime', wintypes.FILETIME),
        ('nFileSizeHigh', wintypes.DWORD),
        ('nFileSizeLow', wintypes.DWORD),
        ('dwReserved0', wintypes.DWORD),
        ('dwReserved1', wintypes.DWORD),
        ('cFileName', wintypes.WCHAR * 260),
        ('cAlternateFileName', wintypes.WCHAR * 14),
    ]

kernel32 = ctypes.windll.kernel32
kernel32.FindFirstFileW.argtypes = [wintypes.LPCWSTR, POINTER(WIN32_FIND_DATAW)]
kernel32.FindFirstFileW.restype = wintypes.HANDLE

fd = WIN32_FIND_DATAW()
search_path = r"\?\Volume{d2f60700-e074-11f1-a1ac-a88c3ecbb62c}\*"
h = kernel32.FindFirstFileW(search_path, byref(fd))
print('FindFirstFileW handle:', hex(h if h > 0 else (h + (1<<64))))
if h != wintypes.HANDLE(-1).value and h != -1:
    print('Found:', fd.cFileName)
    while kernel32.FindNextFileW(h, byref(fd)):
        print('Found:', fd.cFileName)
    kernel32.FindClose(h)
else:
    print('Err:', kernel32.GetLastError())
