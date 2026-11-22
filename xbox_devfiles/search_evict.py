import os

tools_dir = "J:\\tools"
print("Scanning J:\\tools for evict/release/title...")
for root, dirs, files in os.walk(tools_dir):
    for f in files:
        if f.endswith('.exe') or f.endswith('.dll'):
            path = os.path.join(root, f)
            try:
                with open(path, 'rb') as fp:
                    data = fp.read().lower()
                    matches = []
                    for keyword in [b'evict', b'eviction', b'releasememory', b'titleevict', b'drain']:
                        if keyword in data:
                            matches.append(keyword.decode('ascii'))
                    if matches:
                        print(f"{f}: {matches}")
            except Exception as e:
                pass
