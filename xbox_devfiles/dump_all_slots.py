import ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")

# typedef NTSTATUS (*pfnXpalGetXConfig)(ULONG SlotIndex, PVOID Buffer, ULONG BufferSize, PULONG BytesReturned);
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

# typedef NTSTATUS (*pfnXpalSetXConfig)(ULONG SlotIndex, PVOID Buffer, ULONG BufferSize);
XpalSetXConfig = xpal.XpalSetXConfig
XpalSetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG]
XpalSetXConfig.restype = wintypes.LONG

print("Scanning XConfig slots via xpal.dll...")
buf = (ctypes.c_byte * 256)()
ret_bytes = wintypes.ULONG(0)

active_slots = {}
for slot in range(0x00, 0x150):
    status = XpalGetXConfig(slot, buf, 256, ctypes.byref(ret_bytes))
    if status == 0 and ret_bytes.value > 0:
        val = bytes(buf[:ret_bytes.value])
        active_slots[slot] = val
        hex_str = " ".join(f"{b:02X}" for b in val)
        ascii_str = "".join(chr(b) if 32 <= b < 127 else "." for b in val)
        print(f"Slot 0x{slot:02X} ({slot:3d}): len={ret_bytes.value:2d} | HEX: {hex_str:30s} | ASCII: {ascii_str}")

print(f"\nTotal active slots found: {len(active_slots)}")
