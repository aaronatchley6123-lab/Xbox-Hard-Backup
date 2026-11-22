import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.windll.kernel32

DEBUG_PROCESS = 0x00000001
CREATE_UNICODE_ENVIRONMENT = 0x00000400

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("hProcess", wintypes.HANDLE),
        ("hThread", wintypes.HANDLE),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD)
    ]

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
        ("lpReserved2", ctypes.c_char_p),
        ("hStdInput", wintypes.HANDLE),
        ("hStdOutput", wintypes.HANDLE),
        ("hStdError", wintypes.HANDLE)
    ]

class EXCEPTION_RECORD(ctypes.Structure):
    pass
EXCEPTION_RECORD._fields_ = [
    ("ExceptionCode", wintypes.DWORD),
    ("ExceptionFlags", wintypes.DWORD),
    ("ExceptionRecord", ctypes.POINTER(EXCEPTION_RECORD)),
    ("ExceptionAddress", wintypes.LPVOID),
    ("NumberParameters", wintypes.DWORD),
    ("ExceptionInformation", ctypes.c_ulonglong * 15)
]

class EXCEPTION_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("ExceptionRecord", EXCEPTION_RECORD),
        ("dwFirstChance", wintypes.DWORD)
    ]

class LOAD_DLL_DEBUG_INFO(ctypes.Structure):
    _fields_ = [
        ("hFile", wintypes.HANDLE),
        ("lpBaseOfDll", wintypes.LPVOID),
        ("dwDebugInfoFileOffset", wintypes.DWORD),
        ("nDebugInfoSize", wintypes.DWORD),
        ("lpImageName", wintypes.LPVOID),
        ("fUnicode", wintypes.WORD)
    ]

class OUTPUT_DEBUG_STRING_INFO(ctypes.Structure):
    _fields_ = [
        ("lpDebugStringData", ctypes.c_char_p),
        ("fUnicode", wintypes.WORD),
        ("nDebugStringLength", wintypes.WORD)
    ]

class DEBUG_EVENT_UNION(ctypes.Union):
    _fields_ = [
        ("Exception", EXCEPTION_DEBUG_INFO),
        ("LoadDll", LOAD_DLL_DEBUG_INFO),
        ("DebugString", OUTPUT_DEBUG_STRING_INFO),
        ("raw", ctypes.c_byte * 160)
    ]

class DEBUG_EVENT(ctypes.Structure):
    _fields_ = [
        ("dwDebugEventCode", wintypes.DWORD),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD),
        ("u", DEBUG_EVENT_UNION)
    ]

si = STARTUPINFO()
si.cb = ctypes.sizeof(STARTUPINFO)
pi = PROCESS_INFORMATION()

cmd = r"D:\Windows\explorer.exe"
print(f"Starting debug session for {cmd} ...")

ok = kernel32.CreateProcessW(
    cmd, None, None, None, False,
    DEBUG_PROCESS, None, r"D:\Windows",
    ctypes.byref(si), ctypes.byref(pi)
)

if not ok:
    print(f"CreateProcess failed: {kernel32.GetLastError()}")
    exit(1)

EVENT_CODES = {
    1: "EXCEPTION",
    2: "CREATE_THREAD",
    3: "CREATE_PROCESS",
    4: "EXIT_THREAD",
    5: "EXIT_PROCESS",
    6: "LOAD_DLL",
    7: "UNLOAD_DLL",
    8: "OUTPUT_DEBUG_STRING",
    9: "RIP_EVENT"
}

loaded_dlls = []

while True:
    evt = DEBUG_EVENT()
    if not kernel32.WaitForDebugEvent(ctypes.byref(evt), 5000):
        print("WaitForDebugEvent timed out.")
        break
        
    code_name = EVENT_CODES.get(evt.dwDebugEventCode, str(evt.dwDebugEventCode))
    
    if evt.dwDebugEventCode == 6: # LOAD_DLL
        ld = evt.u.LoadDll
        # Get filename if possible
        buf = ctypes.create_unicode_buffer(512)
        kernel32.GetFinalPathNameByHandleW(ld.hFile, buf, 512, 0)
        dll_name = buf.value
        loaded_dlls.append((ld.lpBaseOfDll, dll_name))
        print(f"  [LOAD_DLL] base={hex(ld.lpBaseOfDll or 0)} path={dll_name}")
        kernel32.CloseHandle(ld.hFile)
        
    elif evt.dwDebugEventCode == 1: # EXCEPTION
        ex = evt.u.Exception.ExceptionRecord
        code_hex = hex(ex.ExceptionCode)
        print(f"  [EXCEPTION] code={code_hex} addr={hex(ex.ExceptionAddress or 0)} first_chance={evt.u.Exception.dwFirstChance}")
        if ex.ExceptionCode == 0xc0000138: # STATUS_ORDINAL_NOT_FOUND
            print("  *** CAUGHT STATUS_ORDINAL_NOT_FOUND ***")
            print(f"  Params: {ex.NumberParameters}")
            for i in range(ex.NumberParameters):
                print(f"    param[{i}] = {hex(ex.ExceptionInformation[i])}")
                
    elif evt.dwDebugEventCode == 8: # OUTPUT_DEBUG_STRING
        ds = evt.u.DebugString
        print(f"  [DEBUG_STR] len={ds.nDebugStringLength}")
        
    elif evt.dwDebugEventCode == 5: # EXIT_PROCESS
        exit_code = evt.u.raw[0]
        print(f"  [EXIT_PROCESS] code={evt.u.raw[0]} (raw)")
        kernel32.ContinueDebugEvent(evt.dwProcessId, evt.dwThreadId, 0x00010002)
        break
        
    # DBG_CONTINUE = 0x00010002, DBG_EXCEPTION_NOT_HANDLED = 0x80010001
    kernel32.ContinueDebugEvent(evt.dwProcessId, evt.dwThreadId, 0x00010002)

kernel32.CloseHandle(pi.hProcess)
kernel32.CloseHandle(pi.hThread)
print("Debug session complete.")
