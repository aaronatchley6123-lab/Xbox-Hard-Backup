import os
import subprocess

for d in ['X:\\', 'Y:\\', 'G:\\']:
    print(f"\n=== Listing {d} ===")
    try:
        entries = os.listdir(d)
        print(f"Total entries: {len(entries)}")
        for e in entries[:25]:
            print(f"  {e}")
    except Exception as ex:
        print(f"Error: {ex}")

