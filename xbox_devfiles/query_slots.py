import ctypes
from ctypes import wintypes

xpal = ctypes.WinDLL(r"C:\Windows\System32\xpal.dll")
kernel32 = ctypes.windll.kernel32

# XpalGetConsoleMode
XpalGetConsoleMode = xpal.XpalGetConsoleMode
XpalGetConsoleMode.restype = wintypes.DWORD
print(f"Current XpalGetConsoleMode(): 0x{XpalGetConsoleMode():02X} ({XpalGetConsoleMode()})")

XpalIsInternalDevkit = xpal.XpalIsInternalDevkit
XpalIsInternalDevkit.restype = ctypes.c_bool
print(f"XpalIsInternalDevkit(): {XpalIsInternalDevkit()}")

XpalIsExternalDevkit = xpal.XpalIsExternalDevkit
XpalIsExternalDevkit.restype = ctypes.c_bool
print(f"XpalIsExternalDevkit(): {XpalIsExternalDevkit()}")

# Query Slot 0xAB
buf = (ctypes.c_ubyte * 64)()
cbRet = ctypes.c_uint32(0)
hr_ab = xpal.XpalGetXConfig(0xAB, buf, 64, ctypes.byref(cbRet))
print(f"Slot 0xAB (ConsoleMode): hr=0x{hr_ab:08X}, len={cbRet.value}, data={[hex(b) for b in buf[:cbRet.value]]}")

# Query Slot 0x112
hr_112 = xpal.XpalGetXConfig(0x112, buf, 64, ctypes.byref(cbRet))
print(f"Slot 0x112 (ManufacturingTestMode): hr=0x{hr_112:08X}, len={cbRet.value}, data={[hex(b) for b in buf[:cbRet.value]]}")

# Query Slot 0x27 and 0x39
for slot in [0x01, 0x02, 0x27, 0x39, 0x64, 0xAA, 0xAB, 0xAC, 0x112]:
    hr = xpal.XpalGetXConfig(slot, buf, 64, ctypes.byref(cbRet))
    if hr == 0:
        print(f"Slot 0x{slot:02X}: len={cbRet.value}, data={[hex(b) for b in buf[:cbRet.value]]}")
    else:
        print(f"Slot 0x{slot:02X}: hr=0x{hr:08X}")
