import os, re

for root in [r"C:\Windows\System32\drivers", r"C:\Windows\System32"]:
    for f in os.listdir(root):
        if f.endswith('.sys') or f.endswith('.dll'):
            path = os.path.join(root, f)
            try:
                data = open(path, 'rb').read()
                if b'Device\\XConfig' in data:
                    print(f"Found in {path}")
            except:
                pass
