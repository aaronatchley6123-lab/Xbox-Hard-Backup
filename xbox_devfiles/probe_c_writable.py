import os

test_dirs = [
    "C:\\",
    "C:\\Windows",
    "C:\\Windows\\Temp",
    "C:\\Windows\\System32",
    "C:\\ProgramData",
    "C:\\Program Files",
    "C:\\Users",
    "C:\\Users\\DefaultAccount",
    "C:\\xbdiag",
    "C:\\taef"
]

print("=== Probing Write Access Across C:\\ Folders ===")

for d in test_dirs:
    if not os.path.exists(d):
        continue
    test_path = os.path.join(d, "write_test_xbx.tmp")
    try:
        with open(test_path, "w") as f:
            f.write("PROBE_OK")
        os.remove(test_path)
        print(f"  {d}: WRITE ALLOWED! (RW)")
    except Exception as e:
        print(f"  {d}: FAILED ({e})")
