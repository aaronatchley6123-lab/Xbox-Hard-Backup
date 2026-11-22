
import ctypes
from ctypes import wintypes, c_ulong, POINTER, byref, Structure, c_void_p
cfgmgr32 = ctypes.windll.cfgmgr32
class DEVOBJECT(Structure):
    _fields_ = [('ObjectType', wintypes.DWORD), ('pszObjectId', wintypes.LPCWSTR), ('cPropertyCount', wintypes.DWORD), ('pProperties', c_void_p)]
cObjects = c_ulong(0)
pObjects = POINTER(DEVOBJECT)()
hr = cfgmgr32.DevGetObjects(1, 0, 0, None, 0, None, byref(cObjects), byref(pObjects))
print('Total objects:', cObjects.value, 'hr:', hex(hr & 0xffffffff))
for i in range(min(cObjects.value, 200)):
    oid = pObjects[i].pszObjectId
    if any(k in oid.lower() for k in ['disk', 'storage', 'usb', 'volume', 'scsi']):
        print(f'[{i}] {oid}')
