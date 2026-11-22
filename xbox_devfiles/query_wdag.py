import ctypes

def main():
    netapi = ctypes.windll.netapi32
    class USER_INFO_1(ctypes.Structure):
        _fields_ = [
            ('usri1_name', ctypes.c_wchar_p),
            ('usri1_password', ctypes.c_wchar_p),
            ('usri1_password_age', ctypes.c_uint32),
            ('usri1_priv', ctypes.c_uint32),
            ('usri1_home_dir', ctypes.c_wchar_p),
            ('usri1_comment', ctypes.c_wchar_p),
            ('usri1_flags', ctypes.c_uint32),
            ('usri1_script_path', ctypes.c_wchar_p)
        ]
    pBuf = ctypes.POINTER(USER_INFO_1)()
    res = netapi.NetUserGetInfo(None, "WDAGUtilityAccount", 1, ctypes.byref(pBuf))
    if res == 0:
        print("Name:   ", pBuf.contents.usri1_name)
        print("Comment:", pBuf.contents.usri1_comment)
        print("Flags:  ", hex(pBuf.contents.usri1_flags))
    else:
        print("NetUserGetInfo failed:", hex(res))

if __name__ == '__main__':
    main()
