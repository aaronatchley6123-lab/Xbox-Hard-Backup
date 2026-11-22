with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
for l in lines:
    if "HermesOS.SeriesX" in l or "registerscratch" in l:
        continue
    new_lines.append(l)

with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("[+] Stripped HermesOS auto-launch from hermes_bridge.py")
