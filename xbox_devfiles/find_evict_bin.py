import os

print("Searching for 'evict' in all binaries in J:\\ and C:\\Windows\\System32...")
targets = ["J:\\", "C:\\Windows\\System32"]

for base in targets:
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith(".exe") or f.endswith(".dll") or f.endswith(".sys"):
                p = os.path.join(root, f)
                try:
                    with open(p, "rb") as fp:
                        data = fp.read()
                        if b"evict" in data.lower():
                            print("Match in:", p)
                except:
                    pass
        if len(root.split("\\")) > 4:
            dirs.clear()
