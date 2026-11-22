import winreg

reg_map = {}
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig") as xcfg:
    i = 0
    while True:
        try:
            sk_name = winreg.EnumKey(xcfg, i)
            i += 1
            try:
                with winreg.OpenKey(xcfg, sk_name) as sk:
                    data, typ = winreg.QueryValueEx(sk, "Version1")
                    if typ == winreg.REG_DWORD:
                        b = int(data).to_bytes(4, 'little')
                    elif typ == winreg.REG_BINARY:
                        b = bytes(data)
                    elif typ == winreg.REG_SZ:
                        b = data.encode('ascii', errors='ignore')
                    elif typ == winreg.REG_QWORD:
                        b = int(data).to_bytes(8, 'little')
                    else:
                        b = bytes(data)
                    reg_map[sk_name] = (b, hex(data) if typ==winreg.REG_DWORD else b.hex())
            except Exception:
                pass
        except OSError:
            break

print(f"Loaded {len(reg_map)} keys from XConfig.")
for k, v in list(reg_map.items())[:20]:
    print(f"  {k:35s} = {v[1]}")
