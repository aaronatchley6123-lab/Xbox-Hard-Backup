import os
import glob

print("--- Listing X:\\ ---")
try:
    print(os.listdir("X:\\"))
except Exception as e:
    print("X: error", e)

print("--- Listing X:\\Apps ---")
try:
    print(os.listdir("X:\\Apps"))
except Exception as e:
    print("X:\\Apps error", e)

print("--- Listing X:\\Windows\\SystemApps ---")
try:
    print(os.listdir("X:\\Windows\\SystemApps"))
except Exception as e:
    print("X:\\Windows\\SystemApps error", e)

print("--- Listing C:\\Program Files ---")
try:
    print(os.listdir("C:\\Program Files"))
except Exception as e:
    print("C:\\Program Files error", e)

print("--- Listing C:\\Program Files\\WindowsApps (if accessible) ---")
try:
    print(os.listdir("C:\\Program Files\\WindowsApps"))
except Exception as e:
    print("C:\\Program Files\\WindowsApps error", e)

print("--- Listing J:\\QuickActions ---")
try:
    print(os.listdir("J:\\QuickActions"))
    for f in os.listdir("J:\\QuickActions"):
        path = os.path.join("J:\\QuickActions", f)
        if os.path.isfile(path):
            with open(path, "r", errors="ignore") as fh:
                print(f"[{f}]:\n{fh.read()}\n")
except Exception as e:
    print("J:\\QuickActions error", e)

print("--- Searching for AppxManifest.xml across drives ---")
for d in ['C:', 'X:', 'J:', 'D:', 'U:', 'S:', 'T:']:
    matches = glob.glob(f"{d}/**/AppxManifest.xml", recursive=True)
    if matches:
        print(f"Found in {d}:")
        for m in matches[:30]:
            print(" ", m)
