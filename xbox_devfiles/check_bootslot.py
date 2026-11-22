import winreg, ctypes

# 1. Check registry
try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\XConfig")
    val, _ = winreg.QueryValueEx(k, "BootSlot")
    print("Registry SYSTEM\\XConfig\\BootSlot:", val)
    winreg.CloseKey(k)
except Exception as e:
    print("Registry read error:", e)

# 2. Check xpal.dll Slot 0x114
try:
    xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")
    get_xc = getattr(xpal, "XpalGetXConfig")
    buf = ctypes.create_string_buffer(64)
    size = ctypes.c_ulong(64)
    res = get_xc(0x114, buf, ctypes.byref(size))
    raw = buf.raw[:size.value]
    print(f"xpal Slot 0x114 (BootSlot): res={res}, raw={raw}")
    if len(raw) > 0:
        val = raw[0]
        slot_name = "Slot A" if val in (0x41, 1, 0) else ("Slot B" if val in (0x42, 2) else f"Unknown ({val})")
        print(f"Decoded Boot Slot: {slot_name}")
except Exception as e:
    print("xpal query error:", e)

