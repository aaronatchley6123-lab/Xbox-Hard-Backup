with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.find('res = json.dumps')
if idx != -1:
    print(text[idx:idx+500])
