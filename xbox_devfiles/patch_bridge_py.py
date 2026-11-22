bridge_path = r"D:\DevelopmentFiles\hermes_bridge.py"
with open(bridge_path, "r") as f:
    code = f.read()

old_27 = 'buf_27 = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", 6))'
new_27 = 'buf_27 = (ctypes.c_ubyte * 4).from_buffer_copy(struct.pack("<I", 0))'

old_39 = 'buf_39 = (ctypes.c_ubyte * 1)(6)'
new_39 = 'buf_39 = (ctypes.c_ubyte * 1)(0)'

if old_27 in code:
    code = code.replace(old_27, new_27).replace(old_39, new_39)
    with open(bridge_path, "w") as f:
        f.write(code)
    print("[+] Patched hermes_bridge.py to keep 0x27=0 and 0x39=0")
else:
    print("[*] Already patched or not matched")
