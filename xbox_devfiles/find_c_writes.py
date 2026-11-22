import os
import time

now = time.time()
print("Scanning C:\\ for recently created/modified files (last 30 days)...")

found = []
for root, dirs, files in os.walk("C:\\"):
    for f in files:
        p = os.path.join(root, f)
        try:
            st = os.stat(p)
            age_days = (now - st.st_mtime) / 86400.0
            if age_days < 30:
                found.append((age_days, p))
        except:
            pass
    if len(root.split("\\")) > 4:
        dirs.clear()

found.sort()
print(f"Total recently modified/created files on C:\\: {len(found)}")
for age, p in found[:30]:
    print(f"  [{age:.1f} days ago] {p}")
