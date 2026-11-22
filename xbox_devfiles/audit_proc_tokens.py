import ctypes
import os

def main():
    print("[*] Auditing running processes and owners...", flush=True)
    advapi32 = ctypes.windll.advapi32
    kernel32 = ctypes.windll.kernel32
    
    class PROCESSENTRY32W(ctypes.Structure):
        _fields_ = [
            ('dwSize', ctypes.c_uint32),
            ('cntUsage', ctypes.c_uint32),
            ('th32ProcessID', ctypes.c_uint32),
            ('th32DefaultHeapID', ctypes.c_void_p),
            ('th32ModuleID', ctypes.c_uint32),
            ('cntThreads', ctypes.c_uint32),
            ('th32ParentProcessID', ctypes.c_uint32),
            ('pcPriClassBase', ctypes.c_int32),
            ('dwFlags', ctypes.c_uint32),
            ('szExeFile', ctypes.c_wchar * 260)
        ]
        
    hSnap = kernel32.CreateToolhelp32Snapshot(0x00000002, 0)
    pe = PROCESSENTRY32W()
    pe.dwSize = ctypes.sizeof(PROCESSENTRY32W)
    
    proc_list = []
    if kernel32.Process32FirstW(hSnap, ctypes.byref(pe)):
        while True:
            proc_list.append((pe.th32ProcessID, pe.szExeFile))
            if not kernel32.Process32NextW(hSnap, ctypes.byref(pe)):
                break
    kernel32.CloseHandle(hSnap)
    
    print(f"[*] Total running processes: {len(proc_list)}", flush=True)
    for pid, name in proc_list:
        hProc = kernel32.OpenProcess(0x1000, False, pid)
        if hProc:
            hTok = ctypes.c_void_p()
            if advapi32.OpenProcessToken(hProc, 0x0008, ctypes.byref(hTok)):
                buf = (ctypes.c_ubyte * 256)()
                ret_len = ctypes.c_uint32()
                if advapi32.GetTokenInformation(hTok, 1, buf, 256, ctypes.byref(ret_len)):
                    # buf contains TOKEN_USER struct: { SID_AND_ATTRIBUTES User; }
                    # User.Sid is a PSID at offset 0 (8 bytes pointer on 64-bit)
                    sid_val = int.from_bytes(bytes(buf[:8]), 'little')
                    pStr = ctypes.c_wchar_p()
                    if advapi32.ConvertSidToStringSidW(ctypes.c_void_p(sid_val), ctypes.byref(pStr)):
                        sid_str = pStr.value
                        kernel32.LocalFree(pStr)
                        user_tag = ""
                        if "1004" in sid_str: user_tag = " [UserMgr2! (Game/ERA)]"
                        elif "1007" in sid_str: user_tag = " [UserMgr5! (Elevated)]"
                        elif "1001" in sid_str: user_tag = " [DevToolsUser]"
                        elif "S-1-5-18" in sid_str: user_tag = " [SYSTEM]"
                        print(f"  PID {pid:<6} {name:<30} {sid_str}{user_tag}", flush=True)
                kernel32.CloseHandle(hTok)
            kernel32.CloseHandle(hProc)

if __name__ == '__main__':
    main()
