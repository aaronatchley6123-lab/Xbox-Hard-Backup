import struct

with open("J:\\tools\\xtfbaseservices.dll", "rb") as f:
    data = f.read()

e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
opt = e_lfanew + 24
exp_rva = struct.unpack_from("<I", data, opt + 112)[0]
num_sec = struct.unpack_from("<H", data, e_lfanew + 6)[0]
sec_tbl = opt + 240

def r2o(rva):
    for i in range(num_sec):
        vsz, vrva, rsz, roff = struct.unpack_from("<IIII", data, sec_tbl + i*40 + 8)
        if vrva <= rva < vrva + vsz:
            return roff + (rva - vrva)
    return None

exp_off = r2o(exp_rva)
num_names, names_rva = struct.unpack_from("<II", data, exp_off + 24)
names_off = r2o(names_rva)
for i in range(num_names):
    nrva = struct.unpack_from("<I", data, names_off + i*4)[0]
    noff = r2o(nrva)
    print("  xtfbaseservices export:", data[noff:data.find(b"\x00", noff)].decode("ascii"))
