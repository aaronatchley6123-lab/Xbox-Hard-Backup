import os

print("Searching for xbdh or LocalState across U: and S:...")
for d in ['U:', 'S:', 'D:']:
    for root, dirs, files in os.walk(d + '\\'):
        for name in dirs + files:
            if 'devhome' in name.lower() or 'xbdh' in name.lower():
                print(os.path.join(root, name))
        if len(root.split('\\')) > 6:
            dirs.clear()
