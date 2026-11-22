import ctypes
import pefile

pe = pefile.PE(r"D:\Windows11\Windows\explorerw.exe")
k32 = ctypes.windll.kernel32
k32.LoadLibraryExW.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_ulong]
k32.LoadLibraryExW.restype = ctypes.c_void_p
k32.SetDllDirectoryW(r"D:\Windows11\Windows")

missing = []
for imp in pe.DIRECTORY_ENTRY_IMPORT:
    dll_name = imp.dll.decode()
    # Try loading from app dir, then System32
    h = k32.LoadLibraryExW(dll_name, None, 0)
    if not h:
        err = k32.GetLastError()
        print(f"[-] MISSING DLL: {dll_name} (err={err})")
        missing.append((dll_name, err))
    else:
        # Check all imported functions / ordinals
        for sym in imp.imports:
            if sym.name:
                p = k32.GetProcAddress(h, sym.name)
                if not p:
                    print(f"[-] MISSING PROC: {dll_name}!{sym.name.decode()}")
            else:
                p = k32.GetProcAddress(h, ctypes.c_void_p(sym.ordinal))
                if not p:
                    print(f"[-] MISSING ORDINAL: {dll_name}!#{sym.ordinal}")
        k32.FreeLibrary(h)

print(f"\n[*] Finished check. Total missing DLLs: {len(missing)}")
