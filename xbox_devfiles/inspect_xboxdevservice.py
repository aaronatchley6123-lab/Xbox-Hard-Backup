import os

p = "M:\\windows\\system32\\XboxDevService.exe"
target_bytes = "040904B0".encode("utf-16le")

with open(p, "rb") as fp:
    data = fp.read()

idx = data.find(target_bytes)
if idx != -1:
    chunk = data[idx:idx+1500]
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
    print(f"=== {p} ===")
    for line in lines[:25]:
        print(" ", line)
