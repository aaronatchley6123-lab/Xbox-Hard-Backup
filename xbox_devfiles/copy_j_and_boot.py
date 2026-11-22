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
            try:
                shutil.copyfile(sf, df)
                copied += 1
            except Exception:
                skipped += 1
    return copied, skipped

c_j, s_j = copy_tree_data_only("J:/tools", "D:/DevelopmentFiles/AllDrives/J_tools")
print(f"[+] J:/tools -> D:/DevelopmentFiles/AllDrives/J_tools: {c_j} copied, {s_j} skipped")

c_b, s_b = copy_tree_data_only("D:/boot", "D:/DevelopmentFiles/AllDrives/D_boot")
print(f"[+] D:/boot -> D:/DevelopmentFiles/AllDrives/D_boot: {c_b} copied, {s_b} skipped")

for root, dirs, files in os.walk("D:/boot"):
    for f in files:
        fp = os.path.join(root, f)
        print(f"=== {fp} ===")
        try:
            with open(fp, "r", errors="ignore") as fh:
                print(fh.read()[:2000])
        except Exception as e:
            print("Read err:", e)
