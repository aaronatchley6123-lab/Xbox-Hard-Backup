import ctypes, os, string
mask = ctypes.windll.kernel32.GetLogicalDrives()
drives = [string.ascii_uppercase[i] for i in range(26) if (mask >> i) & 1]
print("Logical drives:", drives)
if os.path.exists(r"D:\Drives"):
    print("D:\\Drives:", os.listdir(r"D:\Drives"))
for d in drives:
    root = f"{d}:\\"
    try:
        print(f"Drive {root}:", os.listdir(root)[:20])
    except Exception as e:
        print(f"Drive {root} error:", e)
