import ctypes

def check_user(username):
    print(f"\n[*] Checking user: {username}...", flush=True)
    netapi = ctypes.windll.netapi32
    
    class LOCALGROUP_USERS_INFO_0(ctypes.Structure):
        _fields_ = [('lgrui0_name', ctypes.c_wchar_p)]
        
    pBuf = ctypes.POINTER(LOCALGROUP_USERS_INFO_0)()
    entries_read = ctypes.c_uint32(0)
    total_entries = ctypes.c_uint32(0)
    
    # NetUserGetLocalGroups
    res = netapi.NetUserGetLocalGroups(
        None, username, 0, 0,
        ctypes.byref(pBuf), 0xFFFFFFFF,
        ctypes.byref(entries_read),
        ctypes.byref(total_entries)
    )
    print(f"  NetUserGetLocalGroups res: {res:#x}, count: {entries_read.value}", flush=True)
    for i in range(entries_read.value):
        print(f"    Group: {pBuf[i].lgrui0_name}", flush=True)

if __name__ == '__main__':
    for u in ['DevToolsUser', 'UserMgr2', 'UserMgr5', 'Administrator']:
        check_user(u)
