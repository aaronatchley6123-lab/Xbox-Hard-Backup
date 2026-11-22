import ctypes
from ctypes import wintypes
import sys
import os

sys.stdout.reconfigure(line_buffering=True)

kernel32 = ctypes.windll.kernel32

DEBUG_PROCESS = 0x00000001
DEBUG_ONLY_THIS_PROCESS = 0x00000002
PAGE_EXECUTE_READWRITE = 0x40

class STARTUPINFO(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("lpReserved", wintypes.LPWSTR),
        ("lpDesktop", wintypes.LPWSTR),
        ("lpTitle", wintypes.LPWSTR),
        ("dwX", wintypes.DWORD),
        ("dwY", wintypes.DWORD),
        ("dwXSize", wintypes.DWORD),
        ("dwYSize", wintypes.DWORD),
        ("dwXCountChars", wintypes.DWORD),
        ("dwYCountChars", wintypes.DWORD),
        ("dwFillAttribute", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("wShowWindow", wintypes.WORD),
        ("cbReserved2", wintypes.WORD),
        ("lpReserved2", ctypes.POINTER(ctypes.c_byte)),
        ("hStdInput", wintypes.HANDLE),
        ("hStdOutput", wintypes.HANDLE),
        ("hStdError", wintypes.HANDLE),
    ]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("hProcess", wintypes.HANDLE),
        ("hThread", wintypes.HANDLE),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD),
    ]

class EXCEPTION_RECORD(ctypes.Structure):
    pass
EXCEPTION_RECORD._fields_ = [
    ("ExceptionCode", wintypes.DWORD),
    ("ExceptionFlags", wintypes.DWORD),
    ("ExceptionRecord", ctypes.POINTER(EXCEPTION_RECORD)),
    ("ExceptionAddress", ctypes.c_void_p),
    ("NumberParameters", wintypes.DWORD),
    ("ExceptionInformation", ctypes.c_void_p * 15),
]

class EXCEPTION_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("ExceptionRecord", EXCEPTION_RECORD),
        ("dwFirstChance", wintypes.DWORD),
    ]

class CREATE_THREAD_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("hThread", wintypes.HANDLE),
        ("lpThreadLocalBase", ctypes.c_void_p),
        ("lpStartAddress", ctypes.c_void_p),
    ]

class CREATE_PROCESS_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("hFile", wintypes.HANDLE),
        ("hProcess", wintypes.HANDLE),
        ("hThread", wintypes.HANDLE),
        ("lpBaseOfImage", ctypes.c_void_p),
        ("dwDebugInfoFileOffset", wintypes.DWORD),
        ("nDebugInfoSize", wintypes.DWORD),
        ("lpThreadLocalBase", ctypes.c_void_p),
        ("lpStartAddress", ctypes.c_void_p),
        ("lpImageName", ctypes.c_void_p),
        ("fUnicode", wintypes.WORD),
    ]

class EXIT_THREAD_DEBUG_INFO(ctypes.Structure):
    _fields_ = [("dwExitCode", wintypes.DWORD)]

class EXIT_PROCESS_DEBUG_INFO(ctypes.Structure):
    _fields_ = [("dwExitCode", wintypes.DWORD)]

class LOAD_DLL_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("hFile", wintypes.HANDLE),
        ("lpBaseOfDll", ctypes.c_void_p),
        ("dwDebugInfoFileOffset", wintypes.DWORD),
        ("nDebugInfoSize", wintypes.DWORD),
        ("lpImageName", ctypes.c_void_p),
        ("fUnicode", wintypes.WORD),
    ]

class UNLOAD_DLL_DEBUG_INFO(ctypes.Structure):
    _fields_ = [("lpBaseOfDll", ctypes.c_void_p)]

class OUTPUT_DEBUG_STRING_INFO(ctypes.Structure):
    _fields_ = [
        ("lpDebugStringData", ctypes.c_void_p),
        ("fUnicode", wintypes.WORD),
        ("nDebugStringLength", wintypes.WORD),
    ]

class RIP_INFO(ctypes.Structure):
    _fields_ = [
        ("dwError", wintypes.DWORD),
        ("dwType", wintypes.DWORD),
    ]

class DEBUG_EVENT_UNION(ctypes.Union):
    _fields_ = [
        ("Exception", EXCEPTION_DEBUG_INFO),
        ("CreateThread", CREATE_THREAD_DEBUG_INFO),
        ("CreateProcessInfo", CREATE_PROCESS_DEBUG_INFO),
        ("ExitThread", EXIT_THREAD_DEBUG_INFO),
        ("ExitProcess", EXIT_PROCESS_DEBUG_INFO),
        ("LoadDll", LOAD_DLL_DEBUG_INFO),
        ("UnloadDll", UNLOAD_DLL_DEBUG_INFO),
        ("DebugString", OUTPUT_DEBUG_STRING_INFO),
        ("RipInfo", RIP_INFO),
    ]

class DEBUG_EVENT(ctypes.Structure):
    _fields_ = [
        ("dwDebugEventCode", wintypes.DWORD),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD),
        ("u", DEBUG_EVENT_UNION),
    ]

loaded_modules = {}

def get_filename_from_handle(hFile):
    buf = ctypes.create_unicode_buffer(1024)
    if kernel32.GetFinalPathNameByHandleW(hFile, buf, 1024, 0):
        return buf.value
    return ""

def patch_ntdll(hProcess, ntdll_base):
    target = ntdll_base + 0xaa6d
    patch = b"\x48\x85\xc0\x74\x04\xff\x40\x24\x90"
    old_prot = wintypes.DWORD()
    if kernel32.VirtualProtectEx(hProcess, ctypes.c_void_p(target), len(patch), PAGE_EXECUTE_READWRITE, ctypes.byref(old_prot)):
        written = ctypes.c_size_t()
        ok = kernel32.WriteProcessMemory(hProcess, ctypes.c_void_p(target), patch, len(patch), ctypes.byref(written))
        kernel32.VirtualProtectEx(hProcess, ctypes.c_void_p(target), len(patch), old_prot, ctypes.byref(old_prot))
        print(f"[PATCH] Applied ntdll.dll+0xAA6D protection: {ok} ({written.value} bytes)", flush=True)
    else:
        print(f"[PATCH] VirtualProtectEx failed: {kernel32.GetLastError()}", flush=True)

def debug_run(cmd, cwd):
    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    pi = PROCESS_INFORMATION()

    print(f"Launching {cmd}...", flush=True)
    ok = kernel32.CreateProcessW(
        None, cmd, None, None, False,
        DEBUG_ONLY_THIS_PROCESS, None, cwd,
        ctypes.byref(si), ctypes.byref(pi)
    )
    if not ok:
        print(f"CreateProcess failed: {kernel32.GetLastError()}", flush=True)
        return

    de = DEBUG_EVENT()
    ntdll_patched = False
    events_count = 0

    while True:
        if not kernel32.WaitForDebugEvent(ctypes.byref(de), 1000):
            continue

        events_count += 1
        code = de.dwDebugEventCode
        cont = 0x00010002

        if code == 1:
            rec = de.u.Exception.ExceptionRecord
            if rec.ExceptionCode == 0x80000003: # Breakpoint
                cont = 0x00010001
            elif rec.ExceptionCode == 0xC0000005:
                addr = rec.ExceptionAddress
                target_mod = "UNKNOWN"
                target_base = 0
                for base, name in sorted(loaded_modules.items(), reverse=True):
                    if addr >= base:
                        target_mod = name
                        target_base = base
                        break
                offset = addr - target_base if target_base else 0
                print(f"[CRASH_AV] Addr=0x{addr:X} in {target_mod} (+0x{offset:X}) trying to {('WRITE' if rec.ExceptionInformation[0] else 'READ')} 0x{rec.ExceptionInformation[1]:X}", flush=True)
                # If it's a first chance exception, continue to let SEH handle it
                if de.u.Exception.dwFirstChance:
                    cont = 0x00010002
                else:
                    print("Unhandled exception, terminating...", flush=True)
                    kernel32.TerminateProcess(pi.hProcess, 1)
                    break
            else:
                print(f"[EXC] Code=0x{rec.ExceptionCode:08X} at Addr=0x{rec.ExceptionAddress:X} FirstChance={de.u.Exception.dwFirstChance}", flush=True)
                cont = 0x00010001

        elif code == 3: # CREATE_PROCESS
            base = de.u.CreateProcessInfo.lpBaseOfImage
            name = get_filename_from_handle(de.u.CreateProcessInfo.hFile)
            loaded_modules[base] = name or "explorerw.exe"
            print(f"[PROC] Created: {loaded_modules[base]} at 0x{base:X}", flush=True)
            if de.u.CreateProcessInfo.hFile:
                kernel32.CloseHandle(de.u.CreateProcessInfo.hFile)

        elif code == 5: # EXIT_PROCESS
            print(f"[EXIT] Code={de.u.ExitProcess.dwExitCode} (0x{de.u.ExitProcess.dwExitCode:X})", flush=True)
            kernel32.ContinueDebugEvent(de.dwProcessId, de.dwThreadId, 0x00010001)
            break

        elif code == 6: # LOAD_DLL
            base = de.u.LoadDll.lpBaseOfDll
            name = get_filename_from_handle(de.u.LoadDll.hFile)
            loaded_modules[base] = name or f"DLL_0x{base:X}"
            if "ntdll.dll" in (name.lower() if name else "") and not ntdll_patched:
                patch_ntdll(pi.hProcess, base)
                ntdll_patched = True
            if de.u.LoadDll.hFile:
                kernel32.CloseHandle(de.u.LoadDll.hFile)

        elif code == 8: # OUTPUT_DEBUG_STRING
            ds = de.u.DebugString
            buf = ctypes.create_string_buffer(ds.nDebugStringLength)
            read = ctypes.c_size_t()
            kernel32.ReadProcessMemory(pi.hProcess, ds.lpDebugStringData, buf, ds.nDebugStringLength, ctypes.byref(read))
            text = buf.value.decode('utf-8', errors='ignore').strip()
            print(f"[DBG_STR] {text}", flush=True)
            cont = 0x00010001

        kernel32.ContinueDebugEvent(de.dwProcessId, de.dwThreadId, cont)

    kernel32.CloseHandle(pi.hThread)
    kernel32.CloseHandle(pi.hProcess)

if __name__ == "__main__":
    debug_run(r"D:\Windows\explorer.exe", r"D:\Windows")
