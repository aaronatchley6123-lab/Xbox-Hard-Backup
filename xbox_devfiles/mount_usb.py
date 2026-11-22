
import ctypes
from ctypes import wintypes
kernel32 = ctypes.windll.kernel32
kernel32.SetVolumeMountPointW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]
kernel32.SetVolumeMountPointW.restype = wintypes.BOOL

vol = r"\?\Volume{d2f60700-e074-11f1-a1ac-a88c3ecbb62c}"
mount_point = r"E:"
ok = kernel32.SetVolumeMountPointW(mount_point, vol)
print('SetVolumeMountPointW result:', ok, 'error:', kernel32.GetLastError())
