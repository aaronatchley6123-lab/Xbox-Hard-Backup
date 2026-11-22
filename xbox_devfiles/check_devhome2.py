import os, re

p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe"
data = open(os.path.join(p, "resources.pri"), "rb").read()
for m in re.finditer(b"no longer", data, re.IGNORECASE):
    s = max(0, m.start() - 100)
    e = min(len(data), m.end() + 150)
    print("PRI ASCII:", data[s:e].decode("latin1", errors="ignore"))
for m in re.finditer(b"n\x00o\x00 \x00l\x00o\x00n\x00g\x00e\x00r\x00", data, re.IGNORECASE):
    s = max(0, m.start() - 100)
    e = min(len(data), m.end() + 200)
    print("PRI UTF16:", data[s:e].decode("utf-16le", errors="ignore"))

print("=== DevHome files ===")
for root, dirs, files in os.walk(p):
    for f in files:
        if f.endswith((".js", ".html", ".json")):
            fp = os.path.join(root, f)
            print(" ", os.path.relpath(fp, p))
