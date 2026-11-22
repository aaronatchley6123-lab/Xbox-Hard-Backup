with open("J:\\tools\\xtffileio.dll", "rb") as f:
    data = f.read()

import struct

e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
optional_header = e_lfanew + 4 + 20
export_rva = struct.unpack_from("<I", data, optional_header + 112)[0]
num_sections = struct.unpack_from("<H", data, e_lfanew + 6)[0]
sec_table = optional_header + 240

def rva_to_offset(rva):
    for i in range(num_sections):
        sec = sec_table + i * 40
        vsize, vrva, rsize, roff = struct.unpack_from("<IIII", data, sec + 8)
        if vrva <= rva < vrva + vsize:
            return roff + (rva - vrva)
    return None

exp_off = rva_to_offset(export_rva)
num_funcs, num_names, funcs_rva, names_rva, ords_rva = struct.unpack_from("<IIIII", data, exp_off + 20)
names_off = rva_to_offset(names_rva)
for i in range(num_names):
    name_rva = struct.unpack_from("<I", data, names_off + i * 4)[0]
    name_str_off = rva_to_offset(name_rva)
    end = data.find(b"\x00", name_str_off)
    print("  xtffileio export:", data[name_str_off:end].decode("ascii"))
