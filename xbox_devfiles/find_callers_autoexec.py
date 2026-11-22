import os

for root in [r"C:\Windows\System32", r"D:\DevelopmentFiles"]:
    for f in os.listdir(root):
        if f.endswith('.exe') or f.endswith('.dll') or f.endswith('.sys'):
            p = os.path.join(root, f)
            try:
                data = open(p, 'rb').read()
                if b'autoexec.cmd' in data or b'autoexec' in data.lower():
                    print(f"Ref in: {p}")
            except:
                pass
