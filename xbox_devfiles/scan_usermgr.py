import os

for u in ["UserMgr2", "UserMgr5", "DefaultAccount"]:
    path = os.path.join(r"Q:\Users", u)
    print(f"=== {u} ===")
    try:
        entries = os.listdir(path)
        print(f"  Entries ({len(entries)}): {entries}")
    except Exception as e:
        print(f"  Error: {e}")
