import ctypes
from ctypes import wintypes

netapi32 = ctypes.WinDLL("netapi32")

class USER_INFO_0(ctypes.Structure):
    _fields_ = [("usri0_name", wintypes.LPWSTR)]

class LOCALGROUP_MEMBERS_INFO_3(ctypes.Structure):
    _fields_ = [("lgrmi3_domainandname", wintypes.LPWSTR)]

buf = ctypes.c_void_p()
entries = wintypes.DWORD()
total = wintypes.DWORD()
resume = wintypes.DWORD(0)

rc = netapi32.NetUserEnum(None, 0, 2, ctypes.byref(buf), 0xFFFFFFFF, ctypes.byref(entries), ctypes.byref(total), ctypes.byref(resume))
print(f"NetUserEnum rc={rc}, count={entries.value}:")
if rc == 0 and buf:
    arr = ctypes.cast(buf, ctypes.POINTER(USER_INFO_0))
    for i in range(entries.value):
        print("  User:", arr[i].usri0_name)
    netapi32.NetApiBufferFree(buf)

for grp in ["Administrators", "Users", "DevToolsUsers"]:
    buf2 = ctypes.c_void_p()
    e2 = wintypes.DWORD()
    t2 = wintypes.DWORD()
    r2 = ctypes.c_void_p(0)
    rc2 = netapi32.NetLocalGroupGetMembers(None, grp, 3, ctypes.byref(buf2), 0xFFFFFFFF, ctypes.byref(e2), ctypes.byref(t2), ctypes.byref(r2))
    print(f"Group '{grp}' rc={rc2}, count={e2.value}:")
    if rc2 == 0 and buf2:
        arr2 = ctypes.cast(buf2, ctypes.POINTER(LOCALGROUP_MEMBERS_INFO_3))
        for i in range(e2.value):
            print("  Member:", arr2[i].lgrmi3_domainandname)
        netapi32.NetApiBufferFree(buf2)
