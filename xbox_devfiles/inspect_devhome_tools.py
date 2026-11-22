import os

tool_dir = r"X:\Apps\DevHome\toolwindows"
print(f"=== Toolwindows in DevHome ({tool_dir}) ===")
for root, dirs, files in os.walk(tool_dir):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), tool_dir)
        print(" ", rel)

