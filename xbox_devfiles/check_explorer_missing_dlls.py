import struct, os

def check_missing_dlls(filepath):
    print(f"\n--- Checking Missing DLLs for {filepath} ---")
    with open(filepath, 'rb') as f:
        data = f.read()
    
    e_lfanew = struct.unpack('<I', data[0x3C:0x40])[0]
    magic = struct.unpack('<H', data[e_lfanew+24:e_lfanew+26])[0]
    is_64 = (magic == 0x20B)
    import_rva = struct.unpack('<I', data[e_lfanew+144:e_lfanew+148])[0] if is_64 else struct.unpack('<I', data[e_lfanew+128:e_lfanew+132])[0]
    
    num_sections = struct.unpack('<H', data[e_lfanew+6:e_lfanew+8])[0]
    opt_header_size = struct.unpack('<H', data[e_lfanew+20:e_lfanew+22])[0]
    sec_offset = e_lfanew + 24 + opt_header_size
    sections = []
    for i in range(num_sections):
        s_data = data[sec_offset + i*40 : sec_offset + (i+1)*40]
        s_name = s_data[:8].rstrip(b'\0').decode('latin1', errors='ignore')
        s_vsize, s_va, s_raw_size, s_raw_ptr = struct.unpack('<IIII', s_data[8:24])
        sections.append((s_name, s_va, s_vsize, s_raw_ptr, s_raw_size))

    def rva_to_offset(rva):
        for name, va, vsize, raw_ptr, raw_size in sections:
            if va <= rva < va + max(vsize, raw_size):
                return raw_ptr + (rva - va)
        return None

    imp_off = rva_to_offset(import_rva)
    dlls = []
    curr = imp_off
    while True:
        desc = data[curr:curr+20]
        if len(desc) < 20 or desc == b'\0'*20:
            break
        orig_first_thunk, ts, fwd, name_rva, first_thunk = struct.unpack('<IIIII', desc)
        name_off = rva_to_offset(name_rva)
        if name_off:
            dll_name = data[name_off:].split(b'\0')[0].decode('latin1', errors='ignore')
            dlls.append(dll_name)
        curr += 20
    
    print(f"Total direct imported DLLs: {len(dlls)}")
    dir_path = os.path.dirname(filepath)
    search_dirs = [
        dir_path,
        r"C:\Windows\System32",
        r"M:\windows\system32",
        r"C:\Windows\SysWOW64"
    ]
    
    missing = []
    found = []
    for d in dlls:
        # Check if api-ms / ext-ms
        if d.lower().startswith("api-ms-") or d.lower().startswith("ext-ms-"):
            found.append(d)
            continue
        exists = False
        for s in search_dirs:
            p = os.path.join(s, d)
            if os.path.exists(p):
                exists = True
                break
        if exists:
            found.append(d)
        else:
            missing.append(d)
            
    print(f"Found DLLs ({len(found)})")
    print(f"MISSING DLLs ({len(missing)}): {missing}")

check_missing_dlls(r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\FileExplorer.exe")
check_missing_dlls(r"C:\Windows\DefaultApp\DefaultApp.exe")
