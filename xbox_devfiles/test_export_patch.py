import ctypes
from ctypes import wintypes
import struct
import bisect

k32 = ctypes.WinDLL("kernel32", use_last_error=True)
k32.LoadLibraryA.argtypes = [ctypes.c_char_p]
k32.LoadLibraryA.restype = ctypes.c_void_p
k32.LoadLibraryW.argtypes = [ctypes.c_wchar_p]
k32.LoadLibraryW.restype = ctypes.c_void_p
k32.VirtualProtect.argtypes = [ctypes.c_void_p, ctypes.c_size_t, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD)]
k32.VirtualProtect.restype = wintypes.BOOL
k32.VirtualAlloc.argtypes = [ctypes.c_void_p, ctypes.c_size_t, wintypes.DWORD, wintypes.DWORD]
k32.VirtualAlloc.restype = ctypes.c_void_p
k32.GetProcAddress.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
k32.GetProcAddress.restype = ctypes.c_void_p

h_win32u = k32.LoadLibraryA(b"win32u.dll")
dos_hdr = ctypes.string_at(h_win32u, 64)
e_lfanew = struct.unpack_from("<I", dos_hdr, 0x3C)[0]
opt_hdr_off = e_lfanew + 24
export_rva, export_size = struct.unpack_from("<II", ctypes.string_at(h_win32u + opt_hdr_off + 112, 8), 0)
export_dir_addr = h_win32u + export_rva

num_funcs, num_names, funcs_rva, names_rva, ords_rva = struct.unpack_from("<IIIII", ctypes.string_at(export_dir_addr + 20, 20), 0)
funcs_addr = h_win32u + funcs_rva
names_addr = h_win32u + names_rva
ords_addr = h_win32u + ords_rva

orig_funcs = list(struct.unpack_from(f"<{num_funcs}I", ctypes.string_at(funcs_addr, num_funcs * 4), 0))
orig_names_ptrs = list(struct.unpack_from(f"<{num_names}I", ctypes.string_at(names_addr, num_names * 4), 0))
orig_ords = list(struct.unpack_from(f"<{num_names}H", ctypes.string_at(ords_addr, num_names * 2), 0))

items = []
for i in range(num_names):
    name_str = ctypes.string_at(h_win32u + orig_names_ptrs[i]).decode('ascii', 'ignore')
    ord_val = orig_ords[i]
    func_rva = orig_funcs[ord_val]
    items.append((name_str, orig_names_ptrs[i], ord_val, func_rva))

# Dummy stub: xor eax, eax; ret (31 c0 c3)
dummy_stub = k32.VirtualAlloc(None, 4096, 0x3000, 0x40)
ctypes.memmove(dummy_stub, b"\x31\xc0\xc3", 3)
dummy_rva = dummy_stub - h_win32u

# Add the two missing functions
def add_stub(name):
    # Allocate string memory
    s_addr = k32.VirtualAlloc(None, 256, 0x3000, 0x40)
    ctypes.memmove(s_addr, name.encode() + b"\x00", len(name) + 1)
    s_rva = s_addr - h_win32u
    return (name, s_rva, len(orig_funcs), dummy_rva)

for missing_name in ["NtUserCreateLayoutSyncForHwnd", "NtUserEnableSynchronizedLayout"]:
    items.append(add_stub(missing_name))
    orig_funcs.append(dummy_rva)

# Sort all items alphabetically by name
items.sort(key=lambda x: x[0])

new_num_names = len(items)
new_num_funcs = len(orig_funcs)

# Allocate memory for new names array, ordinals array, and funcs array
new_funcs_mem = k32.VirtualAlloc(None, new_num_funcs * 4, 0x3000, 0x40)
new_names_mem = k32.VirtualAlloc(None, new_num_names * 4, 0x3000, 0x40)
new_ords_mem = k32.VirtualAlloc(None, new_num_names * 2, 0x3000, 0x40)

new_funcs_bytes = struct.pack(f"<{new_num_funcs}I", *orig_funcs)
new_names_bytes = struct.pack(f"<{new_num_names}I", *[x[1] for x in items])
new_ords_bytes = struct.pack(f"<{new_num_names}H", *[x[2] for x in items])

ctypes.memmove(new_funcs_mem, new_funcs_bytes, len(new_funcs_bytes))
ctypes.memmove(new_names_mem, new_names_bytes, len(new_names_bytes))
ctypes.memmove(new_ords_mem, new_ords_bytes, len(new_ords_bytes))

# Patch IMAGE_EXPORT_DIRECTORY
old_prot = wintypes.DWORD(0)
k32.VirtualProtect(ctypes.c_void_p(export_dir_addr), 40, 0x40, ctypes.byref(old_prot))

# struct: NumberOfFunctions (4), NumberOfNames (4), AddressOfFunctions (4), AddressOfNames (4), AddressOfNameOrdinals (4)
patch_data = struct.pack("<IIIII",
    new_num_funcs,
    new_num_names,
    new_funcs_mem - h_win32u,
    new_names_mem - h_win32u,
    new_ords_mem - h_win32u
)
ctypes.memmove(export_dir_addr + 20, patch_data, 20)
k32.VirtualProtect(ctypes.c_void_p(export_dir_addr), 40, old_prot.value, ctypes.byref(old_prot))

print("[+] Successfully patched win32u.dll export table in memory!")
print(f"  GetProcAddress('NtUserCreateLayoutSyncForHwnd'): {k32.GetProcAddress(h_win32u, b'NtUserCreateLayoutSyncForHwnd')}")
print(f"  GetProcAddress('NtUserEnableSynchronizedLayout'): {k32.GetProcAddress(h_win32u, b'NtUserEnableSynchronizedLayout')}")

# Now load user32.dll!
h_user = k32.LoadLibraryW(r"D:\Windows11\Windows\System32\user32.dll")
print(f"[+] LoadLibraryW('user32.dll'): {h_user} (WinError: {ctypes.get_last_error()})")
if h_user:
    print(f"  MessageBoxW: {k32.GetProcAddress(h_user, b'MessageBoxW')}")
    print(f"  CreateWindowExW: {k32.GetProcAddress(h_user, b'CreateWindowExW')}")
