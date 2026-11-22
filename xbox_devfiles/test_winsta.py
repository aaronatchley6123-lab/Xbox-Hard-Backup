import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

user32.OpenWindowStationW.restype = wintypes.HANDLE
user32.OpenDesktopW.restype = wintypes.HANDLE
user32.GetProcessWindowStation.restype = wintypes.HANDLE
user32.GetThreadDesktop.restype = wintypes.HANDLE

hWinSta = user32.GetProcessWindowStation()
print(f"Current Process WindowStation: {hWinSta}")

hDesktop = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
print(f"Current Thread Desktop: {hDesktop}")

# Try to open WinSta0
hWinSta0 = user32.OpenWindowStationW("WinSta0", False, 0x037F)
print(f"OpenWindowStation('WinSta0'): handle={hWinSta0}, err={kernel32.GetLastError()}")

# Try to open default desktop
hDeskDefault = user32.OpenDesktopW("default", 0, False, 0x01FF)
print(f"OpenDesktop('default'): handle={hDeskDefault}, err={kernel32.GetLastError()}")
