import ctypes
from ctypes import wintypes

# Let's query EnumDisplaySettingsW
class DEVMODEW(ctypes.Structure):
    _fields_ = [
        ("dmDeviceName", ctypes.c_wchar * 32),
        ("dmSpecVersion", wintypes.WORD),
        ("dmDriverVersion", wintypes.WORD),
        ("dmSize", wintypes.WORD),
        ("dmDriverExtra", wintypes.WORD),
        ("dmFields", wintypes.DWORD),
        ("dmPositionX", ctypes.c_long),
        ("dmPositionY", ctypes.c_long),
        ("dmDisplayOrientation", wintypes.DWORD),
        ("dmDisplayFixedOutput", wintypes.DWORD),
        ("dmColor", ctypes.c_short),
        ("dmDuplex", ctypes.c_short),
        ("dmYResolution", ctypes.c_short),
        ("dmTTOption", ctypes.c_short),
        ("dmCollate", ctypes.c_short),
        ("dmFormName", ctypes.c_wchar * 32),
        ("dmLogPixels", wintypes.WORD),
        ("dmBitsPerPel", wintypes.DWORD),
        ("dmPelsWidth", wintypes.DWORD),
        ("dmPelsHeight", wintypes.DWORD),
        ("dmDisplayFlags", wintypes.DWORD),
        ("dmDisplayFrequency", wintypes.DWORD),
        ("dmICMMethod", wintypes.DWORD),
        ("dmICMIntent", wintypes.DWORD),
        ("dmMediaType", wintypes.DWORD),
        ("dmDitherType", wintypes.DWORD),
        ("dmReserved1", wintypes.DWORD),
        ("dmReserved2", wintypes.DWORD),
        ("dmPanningWidth", wintypes.DWORD),
        ("dmPanningHeight", wintypes.DWORD)
    ]

# In USER3W.dll or user32
k32 = ctypes.windll.kernel32
k32.SetDllDirectoryW(r"D:\Windows11\Windows\System32")
u32 = ctypes.WinDLL(r"D:\Windows11\Windows\System32\USER3W.dll")

dm = DEVMODEW()
dm.dmSize = ctypes.sizeof(DEVMODEW)

ENUM_CURRENT_SETTINGS = -1
res = u32.EnumDisplaySettingsW(None, ENUM_CURRENT_SETTINGS, ctypes.byref(dm))
print(f"EnumDisplaySettingsW: res={res}")
if res:
    print(f"  Width: {dm.dmPelsWidth}")
    print(f"  Height: {dm.dmPelsHeight}")
    print(f"  BitsPerPel: {dm.dmBitsPerPel}")
    print(f"  Frequency: {dm.dmDisplayFrequency} Hz")
