with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
for i in range(max(0, 270), min(len(lines), 290)):
    print(f"{i+1:3d}: {repr(lines[i])}")
