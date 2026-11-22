import os
import struct

def get_imported_dlls(filepath):
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
    except Exception:
        return []

    if len(data) < 64:
        return []

    e_lfanew = struct.unpack('<I', data[0x3C:0x40])[0]
    if len(data) < e_lfanew + 26:
        return []

    magic = struct.unpack('<H', data[e_lfanew+24:e_lfanew+26])[0]
    is_64 = (magic == 0x20B)
    opt_hdr = e_lfanew + 24
    
    # Import Directory is DataDirectory[1] -> offset 120 (for both 32/64)
    import_rva, import_size = struct.unpack('<II', data[opt_hdr+120:opt_hdr+128])
    if import_rva == 0 or import_size == 0:
        return []

    num_sections = struct.unpack('<H', data[e_lfanew+6:e_lfanew+8])[0]
    opt_hdr_size = struct.unpack('<H', data[e_lfanew+20:e_lfanew+22])[0]
    sec_start = e_lfanew + 24 + opt_hdr_size

    sections = []
    for i in range(num_sections):
        sec = data[sec_start + i*40 : sec_start + (i+1)*40]
        vsize = struct.unpack('<I', sec[8:12])[0]
        va = struct.unpack('<I', sec[12:16])[0]
        raw_size = struct.unpack('<I', sec[16:20])[0]
        raw_ptr = struct.unpack('<I', sec[20:24])[0]
        sections.append((va, max(vsize, raw_size), raw_ptr))

    def rva2off(rva):
        for va, sz, ptr in sections:
            if va <= rva < va + sz:
                return ptr + (rva - va)
        return None

    imp_off = rva2off(import_rva)
    if imp_off is None:
        return []

    imported_dlls = []
    curr = imp_off
    while curr + 20 <= len(data):
        entry = data[curr:curr+20]
        if entry == b'\x00' * 20:
            break
        name_rva = struct.unpack('<I', entry[12:16])[0]
        noff = rva2off(name_rva)
        if noff:
            null_byte = data.find(b'\x00', noff)
            dll_name = data[noff:null_byte].decode('latin1', errors='ignore')
            imported_dlls.append(dll_name)
        curr += 20
    return imported_dlls

def main():
    llama_dir = r"D:\DevelopmentFiles\llama"
    print(f"[*] Auditing all DLL dependencies in {llama_dir}...", flush=True)
    all_files = [f for f in os.listdir(llama_dir) if f.endswith('.exe') or f.endswith('.dll')]
    
    missing_map = {}
    for f in all_files:
        full = os.path.join(llama_dir, f)
        imports = get_imported_dlls(full)
        for imp in imports:
            # Check in llama_dir or System32
            in_llama = os.path.exists(os.path.join(llama_dir, imp))
            in_sys32 = os.path.exists(os.path.join(r"C:\Windows\System32", imp))
            if not in_llama and not in_sys32:
                if imp not in missing_map:
                    missing_map[imp] = []
                missing_map[imp].append(f)

    print(f"\n[+] Missing DLLs not found in {llama_dir} OR C:\\Windows\\System32:")
    if not missing_map:
        print("  NONE! All direct imports exist.")
    for imp, users in missing_map.items():
        print(f"  [-] {imp:<30} (needed by: {', '.join(users)})", flush=True)

if __name__ == '__main__':
    main()
