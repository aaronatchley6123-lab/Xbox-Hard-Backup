import os

for root_dir in [r"D:\DevelopmentFiles", r"D:\Windows11", r"D:\Win11", r"T:\ProgramData", r"Q:\Users"]:
    if os.path.exists(root_dir):
        for root, dirs, files in os.walk(root_dir):
            if any("hermesos" in d.lower() for d in dirs):
                print("Found dir in:", root)
            if any("hermes" in f.lower() for f in files):
                for f in files:
                    if "hermes" in f.lower():
                        print("Found file:", os.path.join(root, f))
