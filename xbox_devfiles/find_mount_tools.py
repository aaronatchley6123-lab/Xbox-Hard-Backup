import os

print("Searching for mount utilities and scripts...")
for d in ['J:\\', 'C:\\Windows\\System32', 'M:\\windows\\system32']:
    for root, dirs, files in os.walk(d):
        for f in files:
            if 'mount' in f.lower() or 'disk' in f.lower() or 'vol' in f.lower():
                print(os.path.join(root, f))
        if len(root.split('\\')) > 3:
            dirs.clear()
