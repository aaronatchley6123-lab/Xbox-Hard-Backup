import struct
import sys

def parse_pe_exports(path):
    print(f"[*] Reading {path}...", flush=True)
    with open(path, 'rb') as f:
        data = f.read()

    e_lfanew = struct.unpack('<I', data[0x3C:0x40])[0]
    magic = struct.unpack('<H', data[e_lfanew+24:e_lfanew+26])[0]
    is_64 = (magic == 0x20B)
    print(f"[*] PE format: {'PE32+ (64-bit)' if is_64 else 'PE32 (32-bit)'}", flush=True)

    opt_hdr = e_lfanew + 24
    export_rva, export_size = struct.unpack('<II', data[opt_hdr+112:opt_hdr+120])
    print(f"[*] Export Directory RVA: {hex(export_rva)}, Size: {export_size}", flush=True)
    if export_rva == 0 or export_size == 0:
        print("[-] No export directory found.", flush=True)
        return

    # Section headers
    num_sections = struct.unpack('<H', data[e_lfanew+6:e_lfanew+8])[0]
    opt_hdr_size = struct.unpack('<H', data[e_lfanew+20:e_lfanew+22])[0]
    sec_start = e_lfanew + 24 + opt_hdr_size

    sections = []
    for i in range(num_sections):
        sec = data[sec_start + i*40 : sec_start + (i+1)*40]
        s_name = sec[:8].rstrip(b'\x00').decode('latin1', errors='ignore')
        vsize = struct.unpack('<I', sec[8:12])[0]
        va = struct.unpack('<I', sec[12:16])[0]
        raw_size = struct.unpack('<I', sec[16:20])[0]
        raw_ptr = struct.unpack('<I', sec[20:24])[0]
        sections.append((va, max(vsize, raw_size), raw_ptr, s_name))

    def rva2off(rva):
        for va, sz, ptr, _ in sections:
            if va <= rva < va + sz:
                return ptr + (rva - va)
        return None

    exp_off = rva2off(export_rva)
    if exp_off is None:
        print("[-] Could not map export RVA to file offset.", flush=True)
        return

    num_funcs = struct.unpack('<I', data[exp_off+20:exp_off+24])[0]
    num_names = struct.unpack('<I', data[exp_off+24:exp_off+28])[0]
    funcs_rva = struct.unpack('<I', data[exp_off+28:exp_off+32])[0]
    names_rva = struct.unpack('<I', data[exp_off+32:exp_off+36])[0]
    ords_rva  = struct.unpack('<I', data[exp_off+36:exp_off+40])[0]

    names_off = rva2off(names_rva)
    ords_off  = rva2off(ords_rva)

    print(f"[+] Found {num_names} named exports out of {num_funcs} functions:")
    for i in range(num_names):
        name_rva = struct.unpack('<I', data[names_off + i*4 : names_off + (i+1)*4])[0]
        noff = rva2off(name_rva)
        null_byte = data.find(b'\x00', noff)
        func_name = data[noff:null_byte].decode('ascii', errors='ignore')
        ord_val = struct.unpack('<H', data[ords_off + i*2 : ords_off + (i+1)*2])[0]
        print(f"    [{ord_val:3d}] {func_name}", flush=True)

if __name__ == '__main__':
    parse_pe_exports(r'C:\Windows\System32\xpal.dll')
