import ctypes

def get_exports(dll_path):
    with open(dll_path, 'rb') as f:
        data = f.read()
    import struct
    e_lfanew = struct.unpack_from('<I', data, 0x3C)[0]
    export_rva = struct.unpack_from('<I', data, e_lfanew + 24 + 112 - 24)[0] # In optional header
    # Let's use python ctypes to load as datafile
    kernel32 = ctypes.windll.kernel32
    LOAD_LIBRARY_AS_DATAFILE = 0x00000002
    h = kernel32.LoadLibraryExW(dll_path, None, LOAD_LIBRARY_AS_DATAFILE)
    return h

print("Loading C:\\win32u vs D:\\win32u:")
h_c = ctypes.windll.kernel32.LoadLibraryW(r"C:\Windows\System32\win32u.dll")
h_d = ctypes.windll.kernel32.LoadLibraryExW(r"D:\Windows\System32\win32u.dll", None, 0x8)
print(f"C win32u handle: {hex(h_c if h_c else 0)}")
print(f"D win32u handle: {hex(h_d if h_d else 0)}")

# Check NtUserLoadKeyboardLayoutEx
p_c = ctypes.windll.kernel32.GetProcAddress(h_c, b"NtUserLoadKeyboardLayoutEx")
print(f"NtUserLoadKeyboardLayoutEx in C win32u: {hex(p_c if p_c else 0)}")
