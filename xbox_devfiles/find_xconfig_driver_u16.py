import os

target = "\\Device\\XConfig".encode('utf-16le')

for root in [r"C:\Windows\System32\drivers", r"C:\Windows\System32"]:
    for f in os.listdir(root):
        if f.endswith('.sys') or f.endswith('.dll') or f.endswith('.exe'):
            path = os.path.join(root, f)
            try:
                data = open(path, 'rb').read()
                if target in data:
                    print(f"MATCH: {path}")
            except:
                pass
