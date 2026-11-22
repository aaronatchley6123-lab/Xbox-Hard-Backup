import os

target = b"xvsmaster"
for search_dir in [r"C:\Windows\System32", r"J:\tools"]:
    for f in os.listdir(search_dir):
        p = os.path.join(search_dir, f)
        if os.path.isfile(p):
            try:
                with open(p, "rb") as fp:
                    d = fp.read()
                    if target in d.lower():
                        print(f"[+] Found 'xvsmaster' in: {p}")
            except Exception:
                pass

