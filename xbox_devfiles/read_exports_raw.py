import ctypes
import struct

kernel32 = ctypes.windll.kernel32
hMod = kernel32.LoadLibraryExW(r"C:\Windows\System32\xpal.dll", None, 1) # DONT_RESOLVE_DLL_REFERENCES
if not hMod:
    print("[-] LoadLibraryExW failed")
    exit(1)

base = hMod
e_lfanew = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(base + 0x3C))[0]
nt_hdr = base + e_lfanew
opt_hdr = nt_hdr + 24
exp_dir_rva = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(opt_hdr + 112))[0] # DataDirectory[0].VirtualAddress
if not exp_dir_rva:
    print("[-] No export directory found")
    exit(0)

exp_dir = base + exp_dir_rva
num_names = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(exp_dir + 24))[0]
num_funcs = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(exp_dir + 20))[0]
base_ord = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(exp_dir + 16))[0]
addr_names = base + struct.unpack_from("<I", (ctypes.c_char * 4).from_address(exp_dir + 32))[0]
addr_ords = base + struct.unpack_from("<I", (ctypes.c_char * 4).from_address(exp_dir + 36))[0]

print(f"[+] xpal.dll exports (Total: {num_names} names, {num_funcs} ordinals):")
for i in range(num_names):
    name_rva = struct.unpack_from("<I", (ctypes.c_char * 4).from_address(addr_names + i * 4))[0]
    name = ctypes.string_at(base + name_rva).decode()
    ord_val = struct.unpack_from("<H", (ctypes.c_char * 2).from_address(addr_ords + i * 2))[0] + base_ord
    print(f"  [{ord_val:4d}] {name}")

