import os

print("=== Searching for Source Devkit Packages / XVDs / Recoveries ===")
targets = [b".xvd", b".xvdo", b".appx", b".msix", b".cab", b".puf", b".xup"]

for drive in ['D:\\', 'E:\\', 'M:\\', 'S:\\', 'X:\\', 'Y:\\']:
    print(f"Scanning {drive} for package sources...")
    try:
        for root, dirs, files in os.walk(drive):
            # check if directory itself is interesting
            for f in files:
                fl = f.lower().encode()
                if any(fl.endswith(ext) for ext in targets) or b'devkit' in fl or b'recovery' in fl:
                    p = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(p)
                        print(f"  [{sz//(1024*1024):5d} MB] {p}")
                    except Exception:
                        print(f"  [?] {p}")
    except Exception as e:
        print(f"  Err {drive}: {e}")

