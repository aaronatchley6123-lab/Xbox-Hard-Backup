import os
import subprocess

print("[*] Searching J:\\tools and C:\\Windows\\System32 for official mode switchers...")
# Check all .exe in J:\tools
tools = os.listdir(r"J:\tools")
for t in sorted(tools):
    if t.endswith(".exe"):
        p = os.path.join(r"J:\tools", t)
        try:
            res = subprocess.run([p, "/?"], capture_output=True, text=True, timeout=2)
            out = res.stdout + res.stderr
            if any(k in out.lower() for k in ["mode", "boot", "host", "devkit", "switch", "system", "retail"]):
                print(f"[+] {t} -> {out.splitlines()[0] if out.splitlines() else 'has output'}")
        except Exception:
            pass

