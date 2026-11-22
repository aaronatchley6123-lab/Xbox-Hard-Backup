import ctypes, json, os

with open(r"D:\DevelopmentFiles\ef_imports.json", "r") as f:
    imports = json.load(f)

k32 = ctypes.windll.kernel32
k32.SetDllDirectoryW(r"D:\Windows11\Windows\System32")
k32.LoadLibraryW.restype = ctypes.c_void_p

for imp in imports:
    h = k32.LoadLibraryW(imp)
    err = k32.GetLastError()
    if not h:
        print(f"[-] FAILED IMPORT in ExplorerFrame: {imp} err={err}")
print("[*] Checked all ExplorerFrame imports.")
