import struct, os

def get_pe_imports(filepath):
    print(f"\n--- Checking PE Imports for {filepath} ---")
    if not os.path.exists(filepath):
        print("File does not exist!")
        return
    with open(filepath, 'rb') as f:
        data = f.read()
    
    if data[:2] != b'MZ':
        print("Not a valid PE")
        return
    
    e_lfanew = struct.unpack('<I', data[0x3C:0x40])[0]
    pe_sig = data[e_lfanew:e_lfanew+4]
    if pe_sig != b'PE\0\0':
        print("Invalid PE signature")
        return
    
    magic = struct.unpack('<H', data[e_lfanew+24:e_lfanew+26])[0]
    is_64 = (magic == 0x20B)
    print(f"Architecture: {'PE32+ (64-bit)' if is_64 else 'PE32 (32-bit)'}")
    
    # CLR header? Is it .NET?
    if is_64:
        com_desc_rva = struct.unpack('<I', data[e_lfanew+232:e_lfanew+236])[0]
    else:
        com_desc_rva = struct.unpack('<I', data[e_lfanew+216:e_lfanew+220])[0]
    print(f"CLR / COM Descriptor RVA: {hex(com_desc_rva)}")
    
    # Import Directory RVA
    if is_64:
        import_rva = struct.unpack('<I', data[e_lfanew+144:e_lfanew+148])[0]
    else:
        import_rva = struct.unpack('<I', data[e_lfanew+128:e_lfanew+132])[0]
    print(f"Import Table RVA: {hex(import_rva)}")

    # Sections
    num_sections = struct.unpack('<H', data[e_lfanew+6:e_lfanew+8])[0]
    opt_header_size = struct.unpack('<H', data[e_lfanew+20:e_lfanew+22])[0]
    sec_offset = e_lfanew + 24 + opt_header_size
    sections = []
    for i in range(num_sections):
        s_data = data[sec_offset + i*40 : sec_offset + (i+1)*40]
        s_name = s_data[:8].rstrip(b'\0').decode('latin1', errors='ignore')
        s_vsize, s_va, s_raw_size, s_raw_ptr = struct.unpack('<IIII', s_data[8:24])
        sections.append((s_name, s_va, s_vsize, s_raw_ptr, s_raw_size))
        # print(f"  Section {s_name}: VA={hex(s_va)}, Raw={hex(s_raw_ptr)}")

    def rva_to_offset(rva):
        for name, va, vsize, raw_ptr, raw_size in sections:
            if va <= rva < va + max(vsize, raw_size):
                return raw_ptr + (rva - va)
        return None

    if import_rva != 0:
        imp_off = rva_to_offset(import_rva)
        if imp_off:
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
            print(f"Imported DLLs ({len(dlls)}): {', '.join(dlls)}")

get_pe_imports(r"C:\Windows\DefaultApp\DefaultApp.exe")
get_pe_imports(r"C:\Windows\DefaultApp\XboxOneExtensions.dll")
