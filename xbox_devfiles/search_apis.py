import os, glob

target = b"authoritygetkeyinfo"
target2 = b"ekcli"

sys32 = r"C:\Windows\System32"
matches = []

for root, dirs, files in os.walk(sys32):
    for f in files:
        if f.endswith('.dll') or f.endswith('.exe'):
            p = os.path.join(root, f)
            try:
                with open(p, 'rb') as fp:
                    content = fp.read()
                    c_lower = content.lower()
                    if target in c_lower or target2 in c_lower:
                        matches.append((f, target in c_lower, target2 in c_lower))
                        print(f"[+] Match in {f}: authoritygetkeyinfo={target in c_lower}, ekcli={target2 in c_lower}")
            except Exception:
                pass

print(f"Total matches: {len(matches)}")
