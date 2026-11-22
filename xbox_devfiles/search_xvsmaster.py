import os

target = b"xvsmaster"
for root, dirs, files in os.walk(r"C:\Windows\System32\drivers"):
    for f in files:
        p = os.path.join(root, f)
        try:
            with open(p, "rb") as fp:
                d = fp.read()
                if target in d.lower():
                    print(f"[+] Found 'xvsmaster' in: {p}")
        except Exception:
            pass

