import os, re
print("ALL J:/tools:", os.listdir("J:/tools"))
with open("J:/tools/toolsautoexec.exe", "rb") as f:
    data = f.read()
wstrs = [m.group(0).decode("utf-16le", "ignore") for m in re.finditer(b"(?:[ -~]\x00){4,}", data)]
astrs = [m.group(0).decode("ascii", "ignore") for m in re.finditer(b"[ -~]{5,}", data)]
print("=== WIDE STRINGS IN toolsautoexec.exe ===")
for s in wstrs:
    if not s.startswith("api-ms") and not s.startswith("ext-ms"):
        print(" ", s)
print("=== ASCII STRINGS IN toolsautoexec.exe ===")
for s in astrs:
    if any(k in s.lower() for k in ["auto", "exec", "cmd", "bat", "run", "reg", "dev", "tool", "path", "file", "d:", "c:", "j:", "q:", "xbox", "unattend"]):
        print(" ", s)
