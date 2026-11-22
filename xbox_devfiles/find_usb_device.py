import ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, POINTER, byref, Structure

cfgmgr32 = ctypes.windll.cfgmgr32
DevGetObjects = cfgmgr32.DevGetObjects
DevFreeObjects = cfgmgr32.DevFreeObjects

class DEVOBJECT(Structure):
    _fields_ = [
        ('ObjectType', wintypes.DWORD),
        ('pszObjectId', wintypes.LPCWSTR),
        ('cPropertyCount', wintypes.DWORD),
        ('pProperties', c_void_p)
    ]

cObjects = c_ulong(0)
pObjects = POINTER(DEVOBJECT)()

hr = DevGetObjects(1, 0, 0, None, 0, None, byref(cObjects), byref(pObjects))
if hr == 0 and cObjects.value > 0:
    for i in range(cObjects.value):
        oid = pObjects[i].pszObjectId
        if any(k in oid.lower() for k in ["usb", "removable", "788e"]):
            print(f"[*] Matched USB ID [{i}]: {oid}")
    DevFreeObjects(cObjects.value, pObjects)
