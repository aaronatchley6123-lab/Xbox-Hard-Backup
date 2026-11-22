with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Replace empty try: followed by except
import re
text = re.sub(r'try:\s*\n(\s*)except', r'try:\n\1    pass\n\1except', text)
text = re.sub(r'if os\.path\.exists\(wdapp\):\s*\n(\s*)except', r'if os.path.exists(wdapp):\n\1    pass\n\1except', text)

with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'w', encoding='utf-8') as f:
    f.write(text)
print("[+] Cleaned all empty blocks in hermes_bridge.py")
