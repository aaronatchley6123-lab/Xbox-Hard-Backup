import ctypes
from ctypes import wintypes
import find_vol_links

print("=== Checking Exact Targets of Existing Drive Letters in \\GLOBAL?? ===")
for letter in "CDEGJKLMNOPQSTUVXY":
    drv = letter + ":"
    target = find_vol_links.query_symlink("\\GLOBAL??", drv)
    if target:
        print(f"  {drv} -> '{target}'")
