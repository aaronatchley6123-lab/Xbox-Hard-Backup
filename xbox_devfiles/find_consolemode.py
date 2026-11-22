import os, re

for root in ['C:\\Windows\\System32', 'D:\\DevelopmentFiles']:
    if not os.path.exists(root): continue
    for r, d, files in os.walk(root):
        for f in files:
            if f.endswith('.dll') or f.endswith('.sys') or f.endswith('.winmd'):
                path = os.path.join(r, f)
                try:
                    data = open(path, 'rb').read()
                    if b'DebugUtilities' in data and b'consoleMode' in data:
                        print(f"MATCH: {path}")
                except:
                    pass
