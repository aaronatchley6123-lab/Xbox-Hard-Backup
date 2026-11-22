import ctypes
import os

kernel32 = ctypes.windll.kernel32
LOAD_LIBRARY_AS_DATAFILE = 0x00000002

# Read PE imports manually
import struct

def parse_imports(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    e_lfanew = struct.unpack_from('<I', data, 0x3C)[0]
    opt_magic = struct.unpack_from('<H', data, e_lfanew + 24)[0]
    if opt_magic == 0x20b: # PE32+
        import_rva = struct.unpack_from('<I', data, e_lfanew + 24 + 112)[0]
        import_size = struct.unpack_from('<I', data, e_lfanew + 24 + 116)[0]
        num_sections = struct.unpack_from('<H', data, e_lfanew + 6)[0]
        opt_hdr_size = struct.unpack_from('<H', data, e_lfanew + 20)[0]
        sec_offset = e_lfanew + 24 + opt_hdr_size
        
        sections = []
        for i in range(num_sections):
            name, vsize, vrva, rawsize, rawoff = struct.unpack_from('<8sIIII', data, sec_offset + i*40)
            sections.append((vrva, vsize, rawoff, rawsize))
            
        def rva_to_off(rva):
            for vrva, vsize, rawoff, rawsize in sections:
                if vrva <= rva < vrva + vsize:
                    return rawoff + (rva - vrva)
            return None
            
        off = rva_to_off(import_rva)
        dlls = []
        while off and off < len(data):
            orig_first_thunk, timedate, fwd, name_rva, first_thunk = struct.unpack_from('<IIIII', data, off)
            if name_rva == 0:
                break
            name_off = rva_to_off(name_rva)
            end = data.find(b'\0', name_off)
            dll_name = data[name_off:end].decode('ascii', errors='ignore')
            dlls.append(dll_name)
            off += 20
        return dlls
    return []

user32_path = r"D:\Windows\System32\USER32.dll"
print("USER32.dll imports:")
for d in parse_imports(user32_path):
    print("  -", d)
