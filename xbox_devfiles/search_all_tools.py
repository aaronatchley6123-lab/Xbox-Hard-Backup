import os

dirs = [r"J:\tools", r"C:\xbdiag", r"K:\TDK\tools"]
for d in dirs:
    print(f"\n=== Listing {d} ===")
    if os.path.exists(d):
        try:
            files = os.listdir(d)
            print(f"Total files: {len(files)}")
            for f in sorted(files)[:35]:
                print(f"  {f}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Directory does not exist.")

