
import ctypes
from ctypes import wintypes, create_unicode_buffer

kernel32 = ctypes.windll.kernel32
kernel32.QueryDosDeviceW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
kernel32.QueryDosDeviceW.restype = wintypes.DWORD

kernel32.DefineDosDeviceW.argtypes = [wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR]
kernel32.DefineDosDeviceW.restype = wintypes.BOOL

vol_guid = "Volume{d2f60700-e074-11f1-a1ac-a88c3ecbb62c}"
target = create_unicode_buffer(1024)
res = kernel32.QueryDosDeviceW(vol_guid, target, 1024)
print('QueryDosDevice target:', target.value, 'res:', res)

if res > 0:
    ok = kernel32.DefineDosDeviceW(0, "E:", target.value)
    print('DefineDosDeviceW(0, E:, target):', ok, 'err:', kernel32.GetLastError())
