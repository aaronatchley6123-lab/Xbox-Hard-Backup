import os

paths_to_check = [
    r"Q:\Users\DevToolsUser\AppData\Local\Packages",
    r"U:\Users",
    r"S:\apps",
    r"T:\ProgramData",
    r"Q:\Users"
]

for base in paths_to_check:
    if os.path.exists(base):
        try:
            for root, dirs, files in os.walk(base):
                for d in dirs:
                    if "xkj04xcm6e7n4" in d.lower() or "xboxvmhost" in d.lower():
                        print("Found Package Folder:", os.path.join(root, d))
        except Exception as e:
            pass
