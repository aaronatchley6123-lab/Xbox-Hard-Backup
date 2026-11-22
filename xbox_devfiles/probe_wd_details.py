import subprocess, re
for args in [["J:/tools/wdpanel.exe", "script", "/?"], ["J:/tools/wdapp.exe", "install", "/?"], ["J:/tools/wdapp.exe", "installkey", "/?"], ["J:/tools/wdapp.exe", "applyconfig", "/?"]]:
    r = subprocess.run(args, capture_output=True, text=True, timeout=3)
    print("===", " ".join(args), "===")
    lines = [l.strip() for l in (r.stdout + r.stderr).splitlines() if l.strip()]
    print("\n".join(lines))

with open("J:/tools/wdrun.exe", "rb") as f:
    d = f.read()
wstrs = [m.group(0).decode("utf-16le", "ignore") for m in re.finditer(b"(?:[ -~]\x00){4,}", d)]
print("=== wdrun.exe strings ===")
for s in wstrs:
    if not s.startswith("api-ms") and not s.startswith("ext-ms"):
        print(" ", s)
