import ctypes
from ctypes import wintypes

kernel32 = ctypes.windll.kernel32
buf = ctypes.create_unicode_buffer(1024)

for letter in ['C:', 'D:', 'M:', 'Q:', 'S:', 'T:', 'U:', 'W:', 'X:', 'Y:', 'Z:']:
    ret = kernel32.QueryDosDeviceW(letter, buf, 1024)
    if ret > 0:
        print(f"{letter} -> {buf.value}")
    else:
        print(f"{letter} -> [Not mapped]")
