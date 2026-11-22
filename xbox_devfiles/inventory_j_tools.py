import os, subprocess

tools_dir = r"J:\tools"
print(f"=== Complete Inventory of {tools_dir} ===")

exes = []
dlls = []
dirs = []

for item in sorted(os.listdir(tools_dir)):
    p = os.path.join(tools_dir, item)
    if os.path.isdir(p):
        dirs.append(item)
    elif item.lower().endswith('.exe'):
        exes.append((item, os.path.getsize(p)))
    elif item.lower().endswith('.dll'):
        dlls.append((item, os.path.getsize(p)))

print(f"\n[+] Executables ({len(exes)} tools):")
for name, sz in exes:
    print(f"  {name:<28s} ({sz//1024:6d} KB)")

print(f"\n[+] System Services & DLLs ({len(dlls)} libraries):")
for name, sz in dlls:
    print(f"  {name:<28s} ({sz//1024:6d} KB)")

print(f"\n[+] Subdirectories ({len(dirs)}):")
for d in dirs:
    sub_p = os.path.join(tools_dir, d)
    count = len(os.listdir(sub_p))
    print(f"  {d:<28s} ({count} items)")

