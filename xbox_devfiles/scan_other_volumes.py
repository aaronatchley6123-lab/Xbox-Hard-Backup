import os

volumes_to_check = ['X:\\', 'Y:\\', 'M:\\', 'T:\\', 'U:\\', 'V:\\', 'G:\\', 'S:\\', 'N:\\']

for v in volumes_to_check:
    print(f"\n=== Root of {v} ===")
    try:
        items = os.listdir(v)
        print(f"  Total items: {len(items)}")
        for it in sorted(items)[:20]:
            p = os.path.join(v, it)
            is_dir = os.path.isdir(p)
            sz = os.path.getsize(p) if not is_dir else 0
            print(f"    {'<DIR>' if is_dir else f'{sz:10d}B'} {it}")
    except Exception as e:
        print(f"  Error accessing {v}: {e}")

