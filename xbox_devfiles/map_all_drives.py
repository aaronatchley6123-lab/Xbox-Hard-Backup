import os

drives = ['C:', 'D:', 'E:', 'G:', 'J:', 'K:', 'M:', 'N:', 'O:', 'Q:', 'S:', 'T:', 'U:', 'V:', 'X:', 'Y:']

print("=== Mapped Drive Architecture & Root Manifest ===")

for d in drives:
    path = d + "\\"
    print(f"\n--- Checking {d} ---")
    try:
        items = os.listdir(path)
        print(f"[{d}] ({len(items)} items):")
        for item in items[:15]:
            full = os.path.join(path, item)
            is_dir = os.path.isdir(full)
            print(f"  {'<DIR> ' if is_dir else '      '} {item}")
        if len(items) > 15:
            print(f"  ... and {len(items) - 15} more items")
    except Exception as e:
        print(f"[{d}] Cannot list: {e}")
