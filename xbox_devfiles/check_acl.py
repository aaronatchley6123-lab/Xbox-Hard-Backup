import winreg
import ctypes
from ctypes import wintypes

advapi32 = ctypes.windll.advapi32
kernel32 = ctypes.windll.kernel32

HKEY_LOCAL_MACHINE = 0x80000002
hKey = wintypes.HANDLE()
ret = advapi32.RegOpenKeyExW(HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows NT\CurrentVersion\Winlogon", 0, 0x00020000, ctypes.byref(hKey)) # READ_CONTROL
if ret == 0:
    dwLen = wintypes.DWORD(0)
    advapi32.RegGetKeySecurity(hKey, 7, None, ctypes.byref(dwLen)) # OWNER_SECURITY_INFORMATION | GROUP | DACL = 7
    buf = (ctypes.c_byte * dwLen.value)()
    if advapi32.RegGetKeySecurity(hKey, 7, buf, ctypes.byref(dwLen)):
        print(f"Successfully retrieved Winlogon security descriptor ({dwLen.value} bytes)")
    else:
        print(f"RegGetKeySecurity failed: {kernel32.GetLastError()}")
    advapi32.RegCloseKey(hKey)
else:
    print(f"RegOpenKeyExW failed: {ret}")
