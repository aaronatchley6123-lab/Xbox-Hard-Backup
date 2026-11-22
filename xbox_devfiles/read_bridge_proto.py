with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.find('FS_LIST')
if idx != -1:
    print(text[idx-100:idx+800])
else:
    print("FS_LIST not found")
