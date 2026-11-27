import ctypes
import os

# Load xpal
xpal = ctypes.CDLL('D:/DevelopmentFiles/xpal/xpal')

# Set Manufacturing ID to 0x8001 (MSIX)
result = xpal.xpal_set_manufacturing_id(0x8001)
print(f'xpal_set_manufacturing_id(0x8001): {result}')

# Enable Manufacturing Utilities (bit 0 = enable, bit 1 = utilities)
result = xpal.xpal_set_manufacturing_flags(0x03)
print(f'xpal_set_manufacturing_flags(0x03): {result}')

# Verify
buf = ctypes.create_string_buffer(64)
xpal.xpal_get_manufacturing_id(buf, 64)
mid = int.from_bytes(buf.value.strip(b'\x00'), 'little')
print(f'Verified Manufacturing ID: 0x{mid:04X}')

buf2 = ctypes.create_string_buffer(64)
xpal.xpal_get_manufacturing_flags(buf2, 64)
flags = int.from_bytes(buf2.value.strip(b'\x00'), 'little')
print(f'Verified Flags: 0x{flags:02X}')
