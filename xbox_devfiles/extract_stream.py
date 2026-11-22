import sys
import tarfile
import os

target = r"D:\Windows11\Windows\System32"
os.makedirs(target, exist_ok=True)
print(f"[*] Extracting tar stream into {target}...")
t = tarfile.open(fileobj=sys.stdin.buffer, mode="r|")
count = 0
for member in t:
    t.extract(member, path=target)
    count += 1
    if count % 2000 == 0:
        print(f"[*] Extracted {count} files...")
print(f"[+] Extraction complete! Total files: {count}")
