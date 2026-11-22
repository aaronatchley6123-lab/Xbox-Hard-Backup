#!/usr/bin/env python3
"""
Comprehensive Process Sandbox & Token Security Audit
Tests any target Process ID (or current process) for AppContainer,
Integrity Level, Token Privileges, Job Limits, and Hardware Handles.
"""

import sys
import os
import ctypes
from ctypes import wintypes

def audit_process_sandbox(target_pid=None):
    kernel32 = ctypes.windll.kernel32
    advapi32 = ctypes.windll.advapi32

    # Configure 64-bit safe prototypes
    advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
    advapi32.OpenProcessToken.restype = wintypes.BOOL
    advapi32.GetTokenInformation.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
    advapi32.GetTokenInformation.restype = wintypes.BOOL
    advapi32.ConvertSidToStringSidW.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_wchar_p)]
    advapi32.ConvertSidToStringSidW.restype = wintypes.BOOL
    advapi32.LookupPrivilegeNameW.argtypes = [wintypes.LPCWSTR, ctypes.c_void_p, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
    advapi32.LookupPrivilegeNameW.restype = wintypes.BOOL
    kernel32.IsProcessInJob.argtypes = [wintypes.HANDLE, wintypes.HANDLE, ctypes.POINTER(wintypes.BOOL)]
    kernel32.IsProcessInJob.restype = wintypes.BOOL

    if target_pid is None:
        target_pid = kernel32.GetCurrentProcessId()

    print("=" * 70)
    print(f"[*] SANDBOX & SECURITY AUDIT FOR PROCESS ID: {target_pid}")
    print("=" * 70)

    PROCESS_QUERY_INFORMATION = 0x0400
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    h_proc = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION, False, target_pid)
    if not h_proc:
        h_proc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, target_pid)
    
    if not h_proc:
        print(f"[-] OpenProcess failed for PID {target_pid}: Error {kernel32.GetLastError()}")
        return

    # 1. Open Process Token
    h_tok = wintypes.HANDLE()
    TOKEN_QUERY = 0x0008
    if not advapi32.OpenProcessToken(h_proc, TOKEN_QUERY, ctypes.byref(h_tok)):
        print(f"[-] OpenProcessToken failed: Error {kernel32.GetLastError()}")
        kernel32.CloseHandle(h_proc)
        return

    print("\n--- [1] APPCONTAINER / SANDBOX STATUS ---")
    # TokenIsAppContainer = 29
    is_app_container = wintypes.DWORD(0)
    ret_len = wintypes.DWORD(0)
    if advapi32.GetTokenInformation(h_tok, 29, ctypes.byref(is_app_container), ctypes.sizeof(is_app_container), ctypes.byref(ret_len)):
        if is_app_container.value != 0:
            print("  [!] AppContainer Sandbox: ACTIVE (Process is isolated in an AppContainer jail)")
            # TokenAppContainerSid = 30
            buf_sid = (ctypes.c_ubyte * 128)()
            if advapi32.GetTokenInformation(h_tok, 30, buf_sid, 128, ctypes.byref(ret_len)):
                p_sid = ctypes.c_void_p(int.from_bytes(bytes(buf_sid[:8]), 'little'))
                p_str = ctypes.c_wchar_p()
                if advapi32.ConvertSidToStringSidW(p_sid, ctypes.byref(p_str)):
                    print(f"      AppContainer SID:   {p_str.value}")
                    kernel32.LocalFree(p_str)
        else:
            print("  [+] AppContainer Sandbox: NONE (Process is running UNCONFINED in full Win32 mode!)")
    else:
        print(f"  [-] Failed to query TokenIsAppContainer: Error {kernel32.GetLastError()}")

    print("\n--- [2] TOKEN INTEGRITY LEVEL ---")
    # TokenIntegrityLevel = 25
    buf_il = (ctypes.c_ubyte * 64)()
    if advapi32.GetTokenInformation(h_tok, 25, buf_il, 64, ctypes.byref(ret_len)):
        p_sid = ctypes.c_void_p(int.from_bytes(bytes(buf_il[:8]), 'little'))
        p_str = ctypes.c_wchar_p()
        if advapi32.ConvertSidToStringSidW(p_sid, ctypes.byref(p_str)):
            il_sid = p_str.value
            kernel32.LocalFree(p_str)
            il_name = "Unknown"
            if "S-1-16-4096" in il_sid or "S-1-16-0" in il_sid or "S-1-16-2048" in il_sid:
                il_name = f"Low / Untrusted ({il_sid}) [AppContainer]"
            elif "S-1-16-8192" in il_sid:
                il_name = f"Medium ({il_sid}) [Standard User]"
            elif "S-1-16-12288" in il_sid:
                il_name = f"High ({il_sid}) [Elevated Administrator]"
            elif "S-1-16-16384" in il_sid:
                il_name = f"System ({il_sid}) [NT AUTHORITY\\SYSTEM]"
            else:
                il_name = il_sid
            print(f"  Integrity Level: {il_name}")
        else:
            print(f"  [-] ConvertSidToStringSidW failed: Error {kernel32.GetLastError()}")
    else:
        print(f"  [-] Failed to query TokenIntegrityLevel: Error {kernel32.GetLastError()}")

    print("\n--- [3] USER IDENTITY & SIDs ---")
    # TokenUser = 1
    buf_user = (ctypes.c_ubyte * 128)()
    if advapi32.GetTokenInformation(h_tok, 1, buf_user, 128, ctypes.byref(ret_len)):
        p_sid = ctypes.c_void_p(int.from_bytes(bytes(buf_user[:8]), 'little'))
        p_str = ctypes.c_wchar_p()
        if advapi32.ConvertSidToStringSidW(p_sid, ctypes.byref(p_str)):
            sid_str = p_str.value
            kernel32.LocalFree(p_str)
            user_tag = ""
            if "1004" in sid_str: user_tag = " [UserMgr2! (GameCore / ERA)]"
            elif "1007" in sid_str: user_tag = " [UserMgr5! (Elevated Factory)]"
            elif "1001" in sid_str: user_tag = " [DevToolsUser (Development)]"
            elif "S-1-5-18" in sid_str: user_tag = " [SYSTEM]"
            print(f"  User SID:        {sid_str}{user_tag}")

    print("\n--- [4] PRIVILEGE AUDIT (Present & Enabled) ---")
    # TokenPrivileges = 3
    ret_len = wintypes.DWORD(0)
    advapi32.GetTokenInformation(h_tok, 3, None, 0, ctypes.byref(ret_len))
    if ret_len.value > 0:
        buf_privs = (ctypes.c_ubyte * ret_len.value)()
        if advapi32.GetTokenInformation(h_tok, 3, buf_privs, ret_len.value, ctypes.byref(ret_len)):
            count = int.from_bytes(bytes(buf_privs[:4]), 'little')
            print(f"  Total Token Privileges Registered: {count}")
            # Each entry is LUID (8 bytes) + Attributes (4 bytes) = 12 bytes
            SE_PRIVILEGE_ENABLED = 0x00000002
            enabled_privs = []
            for i in range(count):
                offset = 4 + i * 12
                low = int.from_bytes(bytes(buf_privs[offset:offset+4]), 'little')
                high = int.from_bytes(bytes(buf_privs[offset+4:offset+8]), 'little')
                attrs = int.from_bytes(bytes(buf_privs[offset+8:offset+12]), 'little')
                
                # Lookup name
                luid_obj = ctypes.c_uint64(low | (high << 32))
                name_buf = ctypes.create_unicode_buffer(128)
                name_len = wintypes.DWORD(128)
                if advapi32.LookupPrivilegeNameW(None, ctypes.byref(luid_obj), name_buf, ctypes.byref(name_len)):
                    status = "ENABLED" if (attrs & SE_PRIVILEGE_ENABLED) else "disabled"
                    if attrs & SE_PRIVILEGE_ENABLED:
                        enabled_privs.append(name_buf.value)
            
            print(f"  Actively Enabled Privileges ({len(enabled_privs)}):")
            for ep in enabled_privs:
                print(f"    [+] {ep}")

    print("\n--- [5] JOB OBJECT QUOTA & RESTRICTIONS ---")
    is_in_job = wintypes.BOOL(False)
    if kernel32.IsProcessInJob(h_proc, None, ctypes.byref(is_in_job)):
        if is_in_job.value:
            print("  [!] Process In Job: YES (System is enforcing CPU/Memory limits via Job Object)")
        else:
            print("  [+] Process In Job: NO (Unrestricted process lifetime and memory allocation!)")

    print("\n--- [6] DIRECT HARDWARE HANDLE TESTS ---")
    # Test \\.\xvmctrl
    GENERIC_READ = 0x80000000
    GENERIC_WRITE = 0x40000000
    h_xvm = kernel32.CreateFileW(r"\\.\xvmctrl", GENERIC_READ | GENERIC_WRITE, 3, None, 3, 0x80, None)
    if h_xvm and h_xvm != -1:
        print(f"  [+] \\\\.\\xvmctrl Access:    GRANTED (Handle {h_xvm:#x} opened successfully!)")
        kernel32.CloseHandle(h_xvm)
    else:
        print(f"  [-] \\\\.\\xvmctrl Access:    DENIED (Error {kernel32.GetLastError()})")

    # Test C:\ Windows write vs read
    c_read = os.access(r"C:\Windows\System32\ntoskrnl.exe", os.R_OK)
    c_write = os.access(r"C:\test_probe.tmp", os.W_OK)
    print(f"  [+] C:\\ Read Access:       {'GRANTED' if c_read else 'DENIED'}")
    print(f"  [+] C:\\ Write Access:      {'NATIVE RW (xrofilter bypass active)' if c_write else 'READ-ONLY (XRO active)'}")

    # Test D:\ write
    d_write = os.access(r"D:\DevelopmentFiles", os.W_OK)
    print(f"  [+] D:\\ Write Access:      {'GRANTED' if d_write else 'DENIED'}")

    kernel32.CloseHandle(h_tok)
    kernel32.CloseHandle(h_proc)
    print("=" * 70)

if __name__ == "__main__":
    pid_arg = None
    if len(sys.argv) > 1:
        try:
            pid_arg = int(sys.argv[1])
        except ValueError:
            print(f"Usage: {sys.argv[0]} [PID]")
            sys.exit(1)
    
    audit_process_sandbox(pid_arg)
