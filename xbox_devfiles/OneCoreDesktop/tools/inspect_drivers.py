import os, struct

def inspect_driver(path):
    print(f"\n=== DRIVER: {path} ===")
    try:
        with open(path, 'rb') as f:
            data = f.read()
        e_lfanew = struct.unpack_from('<I', data, 0x3C)[0]
        sig = data[e_lfanew:e_lfanew+4]
        if sig != b'PE\x00\x00':
            print("Not a PE file")
            return
        machine = struct.unpack_from('<H', data, e_lfanew + 4)[0]
        num_sections = struct.unpack_from('<H', data, e_lfanew + 6)[0]
        subsystem = struct.unpack_from('<H', data, e_lfanew + 24 + 68)[0]
        print(f"Machine: 0x{machine:X} (AMD64)")
        print(f"Sections: {num_sections}")
        print(f"Subsystem: {subsystem} (Native Kernel Driver)")
        print(f"File Size: {len(data):,} bytes")
    except Exception as e:
        print("Error:", e)

for d in [
    r'C:\Windows\System32\drivers\pspsra.sys',
    r'C:\Windows\System32\drivers\xvmctrl.sys',
    r'C:\Windows\System32\drivers\xvbus.sys',
    r'C:\Windows\System32\drivers\srakmd.sys'
]:
    inspect_driver(d)
