import os

print("Searching for DevHome user data / LocalState / settings...")
targets = [r'Q:\Users', r'C:\Users', r'D:\Users', r'D:\DevelopmentFiles']

for t in targets:
    if os.path.exists(t):
        try:
            for root, dirs, files in os.walk(t):
                for d in dirs:
                    if 'devhome' in d.lower():
                        p = os.path.join(root, d)
                        print("  Found User Dir:", p)
                        # list contents
                        try:
                            for sub in os.listdir(p):
                                print("    ", sub)
                        except Exception:
                            pass
        except Exception as e:
            print(f"  Err {t}: {e}")

