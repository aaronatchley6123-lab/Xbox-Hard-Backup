import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

DefineDosDeviceW = kernel32.DefineDosDeviceW
DefineDosDeviceW.argtypes = [wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR]
DefineDosDeviceW.restype = wintypes.BOOL

# DDD_RAW_TARGET_PATH = 0x00000001
ok = DefineDosDeviceW(1, "W:", "\\??\\D:\\Windows11")
print(f"DefineDosDeviceW(1, 'W:', '\\??\\D:\\Windows11') -> {ok}, err={ctypes.get_last_error()}")

try:
    items = os.listdir("W:\\")
    print("W:\\ successfully accessed! Contents:", items)
except Exception as e:
    print("W:\\ access error:", e)
