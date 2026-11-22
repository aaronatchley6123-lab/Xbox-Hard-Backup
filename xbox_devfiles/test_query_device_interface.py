import ctypes
from ctypes import wintypes, c_void_p, c_ulong, c_long, POINTER, byref, Structure

cfgmgr32 = ctypes.windll.cfgmgr32

DevGetObjects = cfgmgr32.DevGetObjects
# ULONG DevGetObjects(DEVOBJECTTYPE DeviceObjectType, ULONG QueryFlags, ULONG cRequestedProperties, const DEVPROPCOMPKEY *pRequestedProperties, ULONG cFilterExpression, const DEVPROP_FILTER_EXPRESSION *pFilter, PULONG pcObjects, const DEVOBJECT **ppObjects)
DevFreeObjects = cfgmgr32.DevFreeObjects

# DEVPROPKEY: GUID fmtid, DEVPROPID pid
class DEVPROPKEY(Structure):
    _fields_ = [
        ('fmtid_Data1', wintypes.DWORD),
        ('fmtid_Data2', wintypes.WORD),
        ('fmtid_Data3', wintypes.WORD),
        ('fmtid_Data4', wintypes.BYTE * 8),
        ('pid', wintypes.DWORD)
    ]

# DEVPROPCOMPKEY: DEVPROPKEY Key, DEVPROPSTORE Store, PCWSTR LocaleName
class DEVPROPCOMPKEY(Structure):
    _fields_ = [
        ('Key', DEVPROPKEY),
        ('Store', wintypes.DWORD),
        ('LocaleName', wintypes.LPCWSTR)
    ]

class DEVPROP_FILTER_EXPRESSION(Structure):
    _fields_ = [
        ('Operator', wintypes.DWORD),
        ('PropertyKey', DEVPROPCOMPKEY),
        ('PropertyType', wintypes.DWORD),
        ('PropertyBufferSize', wintypes.DWORD),
        ('PropertyBuffer', c_void_p)
    ]

class DEVPROPVALUE(Structure):
    _fields_ = [
        ('Type', wintypes.DWORD),
        ('BufferSize', wintypes.DWORD),
        ('Buffer', c_void_p)
    ]

class DEVPROPERTY(Structure):
    _fields_ = [
        ('CompKey', DEVPROPCOMPKEY),
        ('PropVal', DEVPROPVALUE)
    ]

class DEVOBJECT(Structure):
    _fields_ = [
        ('ObjectType', wintypes.DWORD),
        ('pszObjectId', wintypes.LPCWSTR),
        ('cPropertyCount', wintypes.DWORD),
        ('pProperties', POINTER(DEVPROPERTY))
    ]

# DevObjectTypeDeviceInterface = 1
cObjects = c_ulong(0)
pObjects = POINTER(DEVOBJECT)()

hr = DevGetObjects(1, 0, 0, None, 0, None, byref(cObjects), byref(pObjects))
print(f"[*] DevGetObjects(DevObjectTypeDeviceInterface): hr={hex(hr & 0xffffffff)}, count={cObjects.value}")

if hr == 0 and cObjects.value > 0:
    for i in range(min(15, cObjects.value)):
        obj = pObjects[i]
        print(f"  [{i}] ID: {obj.pszObjectId}")
    DevFreeObjects(cObjects.value, pObjects)
