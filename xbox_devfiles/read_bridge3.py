with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
for i, l in enumerate(lines[125:195]):
    print(f"{i+126:3d}: {l}", end='')
