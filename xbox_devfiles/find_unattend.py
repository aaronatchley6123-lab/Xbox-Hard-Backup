
with open(r'M:\windows\system32\XboxDevService.exe', 'rb') as f:
    data = f.read()

import struct

str_rva = 0x296225
for off in range(0, 0x1f0000, 1):
    val = struct.unpack_from('<i', data, off)[0]
    if off + 7 + val == str_rva:
        print('Found reference at offset:', hex(off))
        print('Bytes around it:', data[off-40:off+40].hex())
