import os

path = r"C:\\"
try:
    entries = os.listdir(path)
    print(f"C:\\ root entries: {entries}")
    for e in entries:
        full = os.path.join(path, e)
        is_dir = os.path.isdir(full)
        size = 0 if is_dir else os.path.getsize(full)
        print(f"  {'[DIR] ' if is_dir else '[FILE]'} {e:25s} {size} bytes")
except Exception as e:
    print(f"Error reading C:\\: {e}")
