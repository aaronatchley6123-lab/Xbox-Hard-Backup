import os

path = r"\\?\GLOBALROOT\Device\HarddiskVolume18"
try:
    entries = os.listdir(path)
    print(f"Volume18 root entries: {entries}")
    for root, dirs, files in os.walk(path):
        for f in files:
            p = os.path.join(root, f)
            print(f"  {p}")
except Exception as e:
    print(f"Error reading Volume18: {e}")
