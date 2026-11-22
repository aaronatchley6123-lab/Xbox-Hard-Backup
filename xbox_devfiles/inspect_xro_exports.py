import ctypes
from ctypes import wintypes

# Load xrofilter.dll and check exports
kernel32 = ctypes.WinDLL("kernel32")
hMod = kernel32.LoadLibraryW("J:\\tools\\xrofilter.dll")
print("xrofilter.dll loaded:", hex(hMod))

with open("J:\\tools\\xrofilter.dll", "rb") as f:
    data = f.read()

# PE export parser
import struct
e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
optional_header = e_lfanew + 4 + 20
export_rva = struct.unpack_from("<I", data, optional_header + 112)[0]
export_size = struct.unpack_from("<I", data, optional_header + 116)[0]

print(f"Export RVA: 0x{export_rva:X}, Size: 0x{export_size:X}")

# find section with export_rva
num_sections = struct.unpack_from("<H", data, e_lfanew + 6)[0]
sec_table = optional_header + 240 # 64-bit PE

def rva_to_offset(rva):
    for i in range(num_sections):
        sec = sec_table + i * 40
        vsize, vrva, rsize, roff = struct.unpack_from("<IIII", data, sec + 8)
        if vrva <= rva < vrva + vsize:
            return roff + (rva - vrva)
    return None

exp_off = rva_to_offset(export_rva)
if exp_off:
    num_funcs, num_names, funcs_rva, names_rva, ords_rva = struct.unpack_from("<IIIII", data, exp_off + 20)
    print(f"Exported functions: {num_funcs}, Names: {num_names}")
    names_off = rva_to_offset(names_rva)
    for i in range(num_names):
        name_rva = struct.unpack_from("<I", data, names_off + i * 4)[0]
        name_str_off = rva_to_offset(name_rva)
        end = data.find(b"\x00", name_str_off)
        name = data[name_str_off:end].decode("ascii")
        print(f"  Export #{i}: {name}")
