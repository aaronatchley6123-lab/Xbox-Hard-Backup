import ctypes
import os
import sys

print("[*] Inspecting user32.dll imported procedures on live OneCore system...")

k32 = ctypes.windll.kernel32
k32.LoadLibraryA.argtypes = [ctypes.c_char_p]
k32.LoadLibraryA.restype = ctypes.c_void_p
k32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
k32.GetProcAddress.restype = ctypes.c_void_p

# Load user32 PE and read imports
import struct

def parse_pe_imports(path):
    with open(path, "rb") as f:
        data = f.read()
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    num_sections = struct.unpack_from("<H", data, e_lfanew + 6)[0]
    opt_header_offset = e_lfanew + 24
    import_dir_rva = struct.unpack_from("<I", data, opt_header_offset + 120)[0]
    import_dir_size = struct.unpack_from("<I", data, opt_header_offset + 124)[0]
    section_table_offset = opt_header_offset + 240
    
    sections = []
    for i in range(num_sections):
        sec = struct.unpack_from("<8sIIIIIIHHI", data, section_table_offset + i * 40)
        sections.append({
            "name": sec[0].rstrip(b"\x00"),
            "vsize": sec[1],
            "va": sec[2],
            "raw_size": sec[3],
            "raw_offset": sec[4]
        })
        
    def rva_to_offset(rva):
        for s in sections:
            if s["va"] <= rva < s["va"] + s["vsize"]:
                return s["raw_offset"] + (rva - s["va"])
        return 0

    imports = {}
    cur = rva_to_offset(import_dir_rva)
    while True:
        desc = struct.unpack_from("<IIIII", data, cur)
        if desc[3] == 0:  # Name RVA is 0 -> End
            break
        name_off = rva_to_offset(desc[3])
        dll_name = data[name_off:data.find(b"\x00", name_off)].decode("ascii", "ignore")
        
        # Thunk
        thunk_rva = desc[0] or desc[4]
        thunk_off = rva_to_offset(thunk_rva)
        funcs = []
        while True:
            val = struct.unpack_from("<Q", data, thunk_off)[0]
            if val == 0:
                break
            if not (val & 0x8000000000000000): # By name
                fn_off = rva_to_offset(val) + 2
                fn_name = data[fn_off:data.find(b"\x00", fn_off)].decode("ascii", "ignore")
                funcs.append(fn_name)
            thunk_off += 8
        imports[dll_name] = funcs
        cur += 20
    return imports

imports = parse_pe_imports(r"Q:\Windows\System32\user32.dll")
missing = []

for dll, funcs in imports.items():
    h = k32.LoadLibraryA(dll.encode())
    if not h:
        print(f"[-] Missing DLL: {dll}")
        missing.append((dll, "*ALL*"))
        continue
    for fn in funcs:
        p = k32.GetProcAddress(h, fn.encode())
        if not p:
            missing.append((dll, fn))

print(f"[*] Total missing procedures: {len(missing)}")
for dll, fn in missing[:25]:
    print(f"    Missing: {dll} -> {fn}")
