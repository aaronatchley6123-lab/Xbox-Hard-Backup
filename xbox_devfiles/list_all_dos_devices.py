import ctypes

kernel32 = ctypes.windll.kernel32
buf = ctypes.create_unicode_buffer(16384)
ret = kernel32.QueryDosDeviceW(None, buf, 16384)
devices = buf[:ret].split('\0')

# Filter for drives or volume mappings
letters = [d for d in devices if len(d) == 2 and d[1] == ':']
print(f"[+] Total Mounted Drive Letters ({len(letters)}): {sorted(letters)}")

for letter in sorted(letters):
    target = ctypes.create_unicode_buffer(512)
    kernel32.QueryDosDeviceW(letter, target, 512)
    print(f"  {letter} -> {target.value}")

