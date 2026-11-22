import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.windll.kernel32
user3w_path = r"D:\Windows11\Windows\USER3W.dll"
user3w = ctypes.WinDLL(user3w_path)

user3w.OpenWindowStationW.restype = wintypes.HANDLE
user3w.OpenDesktopW.restype = wintypes.HANDLE
user3w.GetProcessWindowStation.restype = wintypes.HANDLE
user3w.GetThreadDesktop.restype = wintypes.HANDLE

hWinSta = user3w.GetProcessWindowStation()
print(f"USER3W GetProcessWindowStation: {hWinSta}")

hDesktop = user3w.GetThreadDesktop(kernel32.GetCurrentThreadId())
print(f"USER3W GetThreadDesktop: {hDesktop}")

hWinSta0 = user3w.OpenWindowStationW("WinSta0", False, 0x037F)
print(f"USER3W OpenWindowStation('WinSta0'): handle={hWinSta0}, err={kernel32.GetLastError()}")

hDeskDefault = user3w.OpenDesktopW("default", 0, False, 0x01FF)
print(f"USER3W OpenDesktop('default'): handle={hDeskDefault}, err={kernel32.GetLastError()}")
