import os, shutil

dst_base = "D:/DevelopmentFiles/AllDrives/M_Drive"
os.makedirs(dst_base, exist_ok=True)

def copy_tree_data_only(src, dst):
    copied = 0
    skipped = 0
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target_dir = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(target_dir, exist_ok=True)
        for f in files:
            sf = os.path.join(root, f)
            df = os.path.join(target_dir, f)
            try:
                shutil.copyfile(sf, df)
                copied += 1
            except Exception:
                skipped += 1
    return copied, skipped

c1, s1 = copy_tree_data_only("M:/windows/DefaultApp", os.path.join(dst_base, "windows/DefaultApp"))
print(f"[+] M:/windows/DefaultApp -> {c1} copied, {s1} skipped")

# Also probe M:/windows/system32 using filenames from C:/Windows/System32 and extra known names
c_sys32_files = []
try:
    c_sys32_files = os.listdir("C:/Windows/System32")
except Exception:
    pass

extra_names = [
    "XboxDevService.exe", "XboxDevService.ProxyStub.dll", "ManufacturingBroker.dll",
    "xnetsharedservice.exe", "xpal.dll", "xvmctrl.sys", "sracmd.exe", "xrun.exe",
    "dwm.exe", "sihost.exe", "cmd.exe", "reg.exe", "sc.exe", "whoami.exe", "powershell.exe"
]
all_names = sorted(set(c_sys32_files + extra_names))

m_sys32_dst = os.path.join(dst_base, "windows/system32")
os.makedirs(m_sys32_dst, exist_ok=True)
m_copied = 0
m_found_names = []
for name in all_names:
    sp = f"M:/windows/system32/{name}"
    try:
        if os.path.isfile(sp):
            shutil.copyfile(sp, os.path.join(m_sys32_dst, name))
            m_copied += 1
            m_found_names.append(name)
    except Exception:
        pass

print(f"[+] M:/windows/system32 probed {len(all_names)} names -> {m_copied} files copied: {m_found_names[:30]}")
