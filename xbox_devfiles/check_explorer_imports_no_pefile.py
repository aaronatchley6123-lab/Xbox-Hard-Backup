import ctypes, json, sys

with open(r"D:\DevelopmentFiles\explorer_import_data.json", "r") as f:
    data = json.load(f)

k32 = ctypes.windll.kernel32
k32.LoadLibraryExW.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_ulong]
k32.LoadLibraryExW.restype = ctypes.c_void_p
k32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
k32.GetProcAddress.restype = ctypes.c_void_p
k32.FreeLibrary.argtypes = [ctypes.c_void_p]
k32.SetDllDirectoryW(r"D:\Windows11\Windows")

missing_dlls = []
missing_procs = []

for dll_name, symbols in data.items():
    h = k32.LoadLibraryExW(dll_name, None, 0)
    if not h:
        err = k32.GetLastError()
        print(f"[-] MISSING DLL: {dll_name} (err={err})")
        missing_dlls.append((dll_name, err))
    else:
        for typ, val in symbols:
            if typ == 'name':
                p = k32.GetProcAddress(h, val.encode())
                if not p:
                    print(f"[-] MISSING PROC: {dll_name}!{val}")
                    missing_procs.append(f"{dll_name}!{val}")
            else:
                p = k32.GetProcAddress(h, ctypes.c_void_p(val))
                if not p:
                    print(f"[-] MISSING ORDINAL: {dll_name}!#{val}")
                    missing_procs.append(f"{dll_name}!#{val}")
        k32.FreeLibrary(h)

print(f"\n[*] Total missing DLLs: {len(missing_dlls)}, missing procs/ordinals: {len(missing_procs)}")
