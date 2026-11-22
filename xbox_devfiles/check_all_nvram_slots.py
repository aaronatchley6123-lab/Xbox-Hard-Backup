import ctypes

xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")
get_xc = getattr(xpal, "XpalGetXConfig")

slots_data = {}
for slot in range(0x00, 0x160):
    buf = ctypes.create_string_buffer(64)
    size = ctypes.c_ulong(64)
    res = get_xc(slot, buf, ctypes.byref(size))
    if res == 0:
        raw = buf.raw[:size.value]
        slots_data[slot] = raw

print(f"Total populated NVRAM slots: {len(slots_data)}")
for slot, data in sorted(slots_data.items()):
    val_hex = data.hex()
    ascii_str = "".join([chr(b) if 32 <= b <= 126 else "." for b in data])
    # check if interesting (not all zeros or specific known slots)
    if any(b != 0 for b in data) or slot in (0x27, 0x39, 0x46, 0xAB, 0xCD, 0x112, 0x114, 0x13B):
        print(f"Slot 0x{slot:02X} ({slot}): {val_hex} | '{ascii_str}'")

