import os

for root_dir in ['C:\\Windows\\System32', 'C:\\Windows', 'D:\\']:
    print(f"=== {root_dir} ===")
    try:
        files = os.listdir(root_dir)
        exes = [f for f in files if f.lower().endswith('.exe')]
        print(f"Found {len(exes)} exes:")
        for e in sorted(exes):
            print(f"  {e}")
    except Exception as e:
        print(f"Error reading {root_dir}: {e}")

