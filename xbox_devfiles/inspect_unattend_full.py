import os, string

print("Inspecting USB drive E: layout:")
for root, dirs, files in os.walk("E:\\"):
    for f in files:
        full = os.path.join(root, f)
        print("  " + full + " (" + str(os.path.getsize(full)) + " bytes)")

with open(r"E:\setup.xboxunattend", "rb") as f:
    raw = f.read()
    crlf = raw.count(b"\r\n")
    lf = raw.count(b"\n")
    print("CRLF: " + str(crlf) + ", Total LF: " + str(lf))
    print("First 100 bytes: " + repr(raw[:100]))
