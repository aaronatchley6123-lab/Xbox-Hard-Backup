import os
import shutil

src = "X:\\Apps\\DevHome"
dst = "D:\\DevelopmentFiles\\DevHomeOverlay"

print("Populating overlay directory with all DevHome assets...")
for root, dirs, files in os.walk(src):
    rel = os.path.relpath(root, src)
    target_dir = os.path.join(dst, rel) if rel != "." else dst
    os.makedirs(target_dir, exist_ok=True)
    for f in files:
        target_file = os.path.join(target_dir, f)
        # do not overwrite our patched framework.js!
        if rel == "framework\\js" and f == "framework.js":
            print("Skipping framework.js (keeping patched version)")
            continue
        if not os.path.exists(target_file):
            src_file = os.path.join(root, f)
            try:
                shutil.copy2(src_file, target_file)
            except Exception as e:
                print(f"Error copying {f}: {e}")

print("Overlay directory fully populated!")
