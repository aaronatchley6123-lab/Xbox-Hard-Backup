import os

target = "040904B0".encode("utf-16le")
sysos_target = "(System OS)".encode("utf-16le")

print("Searching for '(System OS)' binaries across all drives...")
drives = ["C:\\Windows\\System32", "J:\\tools", "X:\\Apps", "S:\\Program Files", "D:\\DevelopmentFiles"]

found_sysos = []

for base in drives:
    if not os.path.exists(base):
        continue
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith(".exe") or f.endswith(".dll") or f.endswith(".sys"):
                p = os.path.join(root, f)
                try:
                    with open(p, "rb") as fp:
                        data = fp.read()
                    if sysos_target in data:
                        found_sysos.append(p)
                        print(f"FOUND (System OS): {p}")
                except:
                    pass
        if len(root.split("\\")) > 4:
            dirs.clear()

print(f"\nTotal (System OS) binaries found: {len(found_sysos)}")
