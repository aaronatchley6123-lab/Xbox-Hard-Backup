import ctypes
import os
import struct

# Load xpal
xpal = ctypes.CDLL(os.path.join(os.environ.get('XBOX_DEVELOPMENT_DIR', 'D:\\DevelopmentFiles'), 'LooseApps', 'pkg', 'libxpal.so'))

# Constants
XCONFIG_MANUFACTURING_ID = 0x02  # Manufacturing ID slot
XCONFIG_SLOT_COUNT = 128

def get_xconfig_string(slot):
    """Get string from xconfig slot"""
    buf = ctypes.create_string_buffer(64)
    result = xpal.xpal_get_xconfig_string(slot, buf, 64)
    if result == 0:
        return buf.value.decode('utf-8', errors='ignore').rstrip('\x00')
    return ""

def set_xconfig_string(slot, value):
    """Set string in xconfig slot"""
    result = xpal.xpal_set_xconfig_string(slot, value.encode('utf-8'), len(value))
    return result == 0

# Check current manufacturing ID
current_id = get_xconfig_string(XCONFIG_MANUFACTURING_ID)
print(f"Current Manufacturing ID: {current_id}")

# Set to MSIX:8001
if set_xconfig_string(XCONFIG_MANUFACTURING_ID, "MSIX:8001"):
    print("Set Manufacturing ID to MSIX:8001")
else:
    print("Failed to set Manufacturing ID")

# Verify
new_id = get_xconfig_string(XCONFIG_MANUFACTURING_ID)
print(f"New Manufacturing ID: {new_id}")
