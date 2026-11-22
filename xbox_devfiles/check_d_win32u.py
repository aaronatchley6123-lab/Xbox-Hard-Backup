import ctypes
h_d = ctypes.windll.kernel32.LoadLibraryExW(r"D:\Windows\System32\win32u.dll", None, 0x8)
p_d = ctypes.windll.kernel32.GetProcAddress(h_d, b"NtUserLoadKeyboardLayoutEx")
print(f"NtUserLoadKeyboardLayoutEx in D win32u: {hex(p_d if p_d else 0)}")
