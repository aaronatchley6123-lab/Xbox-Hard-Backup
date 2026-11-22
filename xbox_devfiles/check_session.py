import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL('kernel32.dll')

session_id = wintypes.DWORD()
kernel32.ProcessIdToSessionId(kernel32.GetCurrentProcessId(), ctypes.byref(session_id))
print(f"Current SSH Python Session ID: {session_id.value}")

user32 = ctypes.WinDLL(r"D:\Windows11\Windows\System32\USER3W.dll")
hwinsta = user32.GetProcessWindowStation()
print(f"Current WindowStation handle: {hex(hwinsta if hwinsta else 0)}")

name_buf = (ctypes.c_wchar * 256)()
needed = wintypes.DWORD()
user32.GetUserObjectInformationW(hwinsta, 2, name_buf, 512, ctypes.byref(needed))
print(f"WindowStation name: {name_buf.value}")

hdesk = user32.GetThreadDesktop(kernel32.GetCurrentThreadId())
print(f"Current Thread Desktop handle: {hex(hdesk if hdesk else 0)}")
user32.GetUserObjectInformationW(hdesk, 2, name_buf, 512, ctypes.byref(needed))
print(f"Desktop name: {name_buf.value}")
