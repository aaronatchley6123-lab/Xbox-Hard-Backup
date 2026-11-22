import ctypes
from ctypes import wintypes

netapi32 = ctypes.windll.netapi32

class LOCALGROUP_USERS_INFO_0(ctypes.Structure):
    _fields_ = [("lgrui0_name", wintypes.LPWSTR)]

users = ["Administrator", "DefaultAccount", "DevToolsUser", "UserMgr2", "UserMgr5"]

for user in users:
    buf = ctypes.c_void_p()
    entries_read = wintypes.DWORD()
    total_entries = wintypes.DWORD()
    status = netapi32.NetUserGetLocalGroups(
        None, user, 0, 0,
        ctypes.byref(buf), -1,
        ctypes.byref(entries_read),
        ctypes.byref(total_entries)
    )
    if status == 0 and buf.value:
        p = ctypes.cast(buf, ctypes.POINTER(LOCALGROUP_USERS_INFO_0))
        groups = [p[i].lgrui0_name for i in range(entries_read.value)]
        netapi32.NetApiBufferFree(buf)
        print(f"User '{user}' belongs to: {groups}")
    else:
        print(f"User '{user}': NetUserGetLocalGroups status {status}")
