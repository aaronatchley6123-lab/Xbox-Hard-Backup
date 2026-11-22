import os, sys

drives = ['C:\\', 'D:\\', 'M:\\', 'X:\\', 'S:\\', 'T:\\']

found = []
for d in drives:
    if not os.path.exists(d):
        continue
    for root, dirs, files in os.walk(d):
        for f in files:
            name_lower = f.lower()
            if 'defaultapp' in name_lower or ('default' in name_lower and 'app' in name_lower):
                full_path = os.path.join(root, f)
                found.append(full_path)
                print(f"[FOUND FILE] {full_path}")
        for dir_name in dirs:
            dir_lower = dir_name.lower()
            if 'defaultapp' in dir_lower or ('default' in dir_lower and 'app' in dir_lower):
                full_dir = os.path.join(root, dir_name)
                print(f"[FOUND DIR] {full_dir}")

print(f"Total matching items found: {len(found)}")
