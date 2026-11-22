import ctypes

def main():
    print("[*] Enumerating local users via netapi32...", flush=True)
    netapi = ctypes.windll.netapi32
    class USER_INFO_0(ctypes.Structure):
        _fields_ = [('usri0_name', ctypes.c_wchar_p)]
    
    pBuf = ctypes.POINTER(USER_INFO_0)()
    entries_read = ctypes.c_uint32(0)
    total_entries = ctypes.c_uint32(0)
    resume_handle = ctypes.c_uint32(0)
    
    res = netapi.NetUserEnum(
        None, 0, 2, # FILTER_NORMAL_ACCOUNT = 2
        ctypes.byref(pBuf), 0xFFFFFFFF,
        ctypes.byref(entries_read),
        ctypes.byref(total_entries),
        ctypes.byref(resume_handle)
    )
    print(f"NetUserEnum status: {res:#x}, count: {entries_read.value}", flush=True)
    for i in range(entries_read.value):
        print(f"  User [{i}]: {pBuf[i].usri0_name}", flush=True)

if __name__ == '__main__':
    main()
