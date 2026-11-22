import os, glob

devhome_dir = r"X:\Apps\DevHome"

# Search for how toolwindows are registered or enabled
found = []
for root, dirs, files in os.walk(devhome_dir):
    for f in files:
        if f.endswith('.js') or f.endswith('.json') or f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                    c = fp.read()
                    if 'toolwindows' in c.lower() or 'toolwindow' in c.lower() or 'registeredtoolwindows' in c.lower():
                        found.append((f, p))
            except Exception:
                pass

print(f"Files referencing toolwindows ({len(found)}):")
for f, p in found[:25]:
    print(f"  {f:<30s} -> {p}")

