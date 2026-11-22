import os

for sub in [r"U:\ShellState", r"U:\UserDataCache", r"U:\Users", r"U:\ServiceState"]:
    if os.path.exists(sub):
        print(f"\n=== {sub} ===")
        try:
            for root, dirs, files in os.walk(sub):
                for f in files:
                    if 'devhome' in f.lower() or 'workspace' in f.lower() or 'setting' in f.lower():
                        print("  File:", os.path.join(root, f))
                for d in dirs:
                    if 'devhome' in d.lower() or 'workspace' in d.lower():
                        print("  Dir:", os.path.join(root, d))
        except Exception as e:
            print(f"  Err {sub}: {e}")

