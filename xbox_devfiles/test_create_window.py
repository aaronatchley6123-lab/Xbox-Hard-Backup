import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)

def py_wnd_proc(hwnd, msg, wparam, lparam):
    return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

wndproc_cb = WNDPROC(py_wnd_proc)

class WNDCLASSEXW(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.UINT),
        ("style", wintypes.UINT),
        ("lpfnWndProc", WNDPROC),
        ("cbClsExtra", ctypes.c_int),
        ("cbWndExtra", ctypes.c_int),
        ("hInstance", wintypes.HINSTANCE),
        ("hIcon", wintypes.HICON),
        ("hCursor", wintypes.HICON),
        ("hbrBackground", wintypes.HBRUSH),
        ("lpszMenuName", wintypes.LPCWSTR),
        ("lpszClassName", wintypes.LPCWSTR),
        ("hIconSm", wintypes.HICON)
    ]

wc = WNDCLASSEXW()
wc.cbSize = ctypes.sizeof(WNDCLASSEXW)
wc.style = 0x0003 # CS_HREDRAW | CS_VREDRAW
wc.lpfnWndProc = wndproc_cb
wc.hInstance = kernel32.GetModuleHandleW(None)
wc.lpszClassName = "TestWindowClass"

atom = user32.RegisterClassExW(ctypes.byref(wc))
print(f"RegisterClassExW: atom={atom} err={kernel32.GetLastError()}")

if atom:
    hwnd = user32.CreateWindowExW(
        0, "TestWindowClass", "Test Window",
        0x00CF0000, # WS_OVERLAPPEDWINDOW
        100, 100, 800, 600,
        None, None, wc.hInstance, None
    )
    print(f"CreateWindowExW: hwnd={hex(hwnd or 0)} err={kernel32.GetLastError()}")
    if hwnd:
        user32.ShowWindow(hwnd, 5) # SW_SHOW
        print("Window created and shown successfully!")
        user32.DestroyWindow(hwnd)
