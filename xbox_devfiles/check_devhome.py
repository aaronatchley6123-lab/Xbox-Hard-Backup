import os

for root_dir in [
    r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe",
    r"C:\Windows\DefaultApp"
]:
    print("=== SEARCHING:", root_dir)
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            fp = os.path.join(root, f)
            try:
                data = open(fp, "rb").read()
                for kw in [b"FileExplorer", b"c5e2524a", b"no longer", b"n\x00o\x00 \x00l\x00o\x00n\x00g\x00e\x00r\x00", b"File Explorer", b"F\x00i\x00l\x00e\x00 \x00E\x00x\x00p\x00l\x00o\x00r\x00e\x00r\x00"]:
                    if kw.lower() in data.lower():
                        print(f"  [{fp}] matches {kw!r}")
                        if f.endswith((".js", ".html", ".json", ".xml", ".txt")):
                            txt = data.decode("utf-8", errors="ignore")
                            for line in txt.splitlines():
                                if any(s in line.lower() for s in ["explorer", "no longer", "c5e2524a", "supported", "shell", "debug"]):
                                    print("    ", line.strip()[:140])
            except Exception as e:
                pass
