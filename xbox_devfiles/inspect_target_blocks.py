import os

files_to_check = [
    "J:\\tools\\toolsautoexec.exe",
    "J:\\tools\\agent-xbox.exe",
    "J:\\tools\\xstudioserviceexe.exe",
    "J:\\tools\\wdrecovery.exe",
    "J:\\tools\\xtfsim.exe",
    "J:\\tools\\xbdiag\\coredevtoolsplugin.dll",
    "J:\\tools\\xbdiag\\crashdumpplugin.dll"
]

target = "040904B0".encode("utf-16le")

for p in files_to_check:
    if not os.path.exists(p):
        continue
    with open(p, "rb") as fp:
        data = fp.read()
    idx = data.find(target)
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
        for line in lines[:20]:
            print(" ", line)
        print("="*40)
