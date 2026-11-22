import subprocess
import os

print("=== Running bcdedit ===")
try:
    p = subprocess.run(["bcdedit.exe", "/enum", "all"], capture_output=True, text=True)
    print("STDOUT:\n", p.stdout)
    print("STDERR:\n", p.stderr)
except Exception as e:
    print("Error:", e)

print("=== Searching for BCD files ===")
for drive in ['C:', 'D:', 'X:', 'J:', 'S:', 'T:', 'U:']:
    for root, dirs, files in os.walk(drive + '\\'):
        for f in files:
            if 'bcd' in f.lower():
                print("Found BCD file:", os.path.join(root, f))
        if len(root.split('\\')) > 3:
            dirs.clear()
