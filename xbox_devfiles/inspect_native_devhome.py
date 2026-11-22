import os, glob

devhome_dir = r"X:\Apps\DevHome"
print(f"=== Contents of {devhome_dir} ===")
for item in sorted(os.listdir(devhome_dir)):
    p = os.path.join(devhome_dir, item)
    is_d = os.path.isdir(p)
    sz = os.path.getsize(p) if not is_d else 0
    print(f"  {'<DIR>' if is_d else f'{sz:10d}B'} {item}")

# Read AppxManifest.xml to find Package Full Name and Application ID
manifest = os.path.join(devhome_dir, "AppxManifest.xml")
if os.path.exists(manifest):
    with open(manifest, "r", encoding="utf-8", errors="ignore") as f:
        print("\n=== AppxManifest.xml ===")
        print(f.read()[:2000])

