import ctypes, json, sys

with open(r"D:\DevelopmentFiles\ps_imports.json", "r") as f:
    data = json.load(f)

k32 = ctypes.windll.kernel32
k32.LoadLibraryExW.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_ulong]
k32.LoadLibraryExW.restype = ctypes.c_void_p
k32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
k32.GetProcAddress.restype = ctypes.c_void_p
k32.SetDllDirectoryW(r"D:\Windows11\Windows\System32\WindowsPowerShell\v1.0")

for dll_name, symbols in data.items():
    h = k32.LoadLibraryExW(dll_name, None, 0)
    if not h:
        print(f"[-] MISSING DLL: {dll_name} err={k32.GetLastError()}")
    else:
        for typ, val in symbols:
            if typ == 'name':
                p = k32.GetProcAddress(h, val.encode())
                if not p:
                    print(f"[-] MISSING PROC: {dll_name}!{val}")
            else:
                p = k32.GetProcAddress(h, ctypes.c_void_p(val))
                if not p:
                    print(f"[-] MISSING ORDINAL: {dll_name}!#{val}")
print("[*] PS import check complete.")
