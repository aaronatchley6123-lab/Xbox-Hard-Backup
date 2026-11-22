import ctypes
from ctypes import wintypes
import find_vol_links

ntdll = ctypes.WinDLL("ntdll")

print("=== Physical Drives in \\GLOBAL?? ===")
for name, tname in find_vol_links.query_dir("\\GLOBAL??"):
    if name.lower().startswith("physicaldrive"):
        target = find_vol_links.query_symlink("\\GLOBAL??", name)
        print(f"  {name} -> {target}")

print("=== Volume GUIDs in \\GLOBAL?? ===")
for name, tname in find_vol_links.query_dir("\\GLOBAL??"):
    if name.lower().startswith("volume{"):
        target = find_vol_links.query_symlink("\\GLOBAL??", name)
        print(f"  {name} -> {target}")
