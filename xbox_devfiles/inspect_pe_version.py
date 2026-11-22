import os
import pefile

print("Scanning PE version info in J:\\tools for BLOCK 040904B0...")
tools_dir = "J:\\tools"

for f in sorted(os.listdir(tools_dir)):
    if f.endswith(".exe") or f.endswith(".dll"):
        path = os.path.join(tools_dir, f)
        try:
            pe = pefile.PE(path, fast_load=True)
            pe.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']])
            if hasattr(pe, 'FileInfo'):
                for fileinfo in pe.FileInfo:
                    for entry in fileinfo:
                        if hasattr(entry, 'StringTable'):
                            for st in entry.StringTable:
                                print(f"=== {f} [Key: {st.Key.decode('latin1', errors='ignore') if isinstance(st.Key, bytes) else st.Key}] ===")
                                for k, v in st.entries.items():
                                    k_str = k.decode('latin1', errors='ignore') if isinstance(k, bytes) else k
                                    v_str = v.decode('latin1', errors='ignore') if isinstance(v, bytes) else v
                                    print(f"  {k_str}: {v_str}")
        except Exception as e:
            # try manual search for 040904B0
            try:
                with open(path, "rb") as fp:
                    data = fp.read()
                    idx = data.find(b"0\x004\x000\x009\x000\x004\x00B\x000\x00")
                    if idx != -1:
                        chunk = data[idx:idx+400]
                        # decode utf-16le strings
                        clean = "".join([chr(c) if 32 <= c < 127 else ("\n" if c == 0 else "") for c in chunk])
                        lines = [line.strip() for line in clean.split("\n") if len(line.strip()) > 3]
                        print(f"=== {f} (raw 040904B0) ===")
                        for l in lines:
                            print(f"  {l}")
            except:
                pass
