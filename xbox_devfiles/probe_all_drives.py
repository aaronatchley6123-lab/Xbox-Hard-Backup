import os
for letter in ["C", "D", "G", "J", "M", "N", "Q", "S", "T", "U", "V", "X", "Y"]:
    path = f"{letter}:\\"
    try:
        items = os.listdir(path)
        print(f"[{path}] ({len(items)} items): {items[:8]}")
    except Exception as e:
        print(f"[{path}] Error: {e}")
