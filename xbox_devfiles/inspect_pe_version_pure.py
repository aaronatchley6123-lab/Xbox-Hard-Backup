import os

tools_dir = "J:\\tools"

def inspect_file(fpath):
    try:
        with open(fpath, "rb") as fp:
            data = fp.read()
    except Exception as e:
        return

    # Look for UTF-16LE "040904B0"
    target = "040904B0".encode("utf-16le")
    idx = 0
    found = False
    while True:
        idx = data.find(target, idx)
        if idx == -1:
            break
        found = True
        # Extract surrounding 1000 bytes
        chunk = data[idx:idx+1500]
        # Parse UTF-16 strings
        # In StringFileInfo, each entry is: length (2 bytes), val_length (2 bytes), type (2 bytes), Key (null-term utf-16), Value
        # Let's decode printable UTF-16LE
        decoded = ""
        i = 0
        while i < len(chunk) - 1:
            c = chunk[i:i+2]
            try:
                ch = c.decode("utf-16le")
                if ch.isprintable():
                    decoded += ch
                elif ch == '\x00':
                    decoded += '\n'
            except:
                pass
            i += 2
        
        lines = [l.strip() for l in decoded.split('\n') if len(l.strip()) > 1]
        print(f"=== {os.path.basename(fpath)} (Offset 0x{idx:X}) ===")
        for line in lines[:25]:
            print("  ", line)
        print("-" * 50)
        idx += len(target)

for fname in sorted(os.listdir(tools_dir)):
    p = os.path.join(tools_dir, fname)
    if os.path.isfile(p) and (fname.endswith(".exe") or fname.endswith(".dll")):
        inspect_file(p)
