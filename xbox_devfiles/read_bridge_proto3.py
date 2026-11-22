with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.find('conn.sendall')
if idx != -1:
    print(text[idx-100:idx+300])
else:
    print("conn.sendall not found")
