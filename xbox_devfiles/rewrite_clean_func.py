with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, l in enumerate(lines):
    if l.startswith("def ensure_win11_desktop_launched"):
        skip = True
        new_lines.append("def ensure_win11_desktop_launched():\n    pass\n")
    elif skip:
        if l.startswith("def ") or l.startswith("# ---") or l.startswith("class ") or l.startswith("server =") or l.startswith("def run_server"):
            skip = False
            new_lines.append(l)
    else:
        new_lines.append(l)

with open(r'D:\DevelopmentFiles\hermes_bridge.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("[+] Rewrote ensure_win11_desktop_launched cleanly")
