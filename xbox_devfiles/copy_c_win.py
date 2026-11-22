import os, shutil

def copy_tree_data_only(src, dst):
    copied = 0
    skipped = 0
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target_dir = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(target_dir, exist_ok=True)
        for f in files:
            sf = os.path.join(root, f)
            df = os.path.join(target_dir, f)
            if os.path.exists(df):
                copied += 1
                continue
            try:
                shutil.copyfile(sf, df)
                copied += 1
            except Exception:
                skipped += 1
    return copied, skipped

c_w, s_w = copy_tree_data_only("C:/Windows", "D:/DevelopmentFiles/AllDrives/C_Windows")
print(f"[+] C:/Windows -> D:/DevelopmentFiles/AllDrives/C_Windows: {c_w} copied, {s_w} skipped")
