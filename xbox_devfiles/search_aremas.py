import os, glob

target = b"aremas"

for search_dir in [r"C:\Windows\System32\drivers", r"C:\Windows\System32", r"J:\tools"]:
    if os.path.exists(search_dir):
        for root, dirs, files in os.walk(search_dir):
            for f in files:
                p = os.path.join(root, f)
                try:
                    with open(p, "rb") as fp:
                        content = fp.read()
                        if target in content.lower():
                            print(f"[+] Found 'aremas' in: {p}")
                except Exception:
                    pass

