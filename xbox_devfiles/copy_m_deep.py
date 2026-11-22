import os, shutil, winreg

dst_m = "D:/DevelopmentFiles/AllDrives/M_Drive"
os.makedirs(dst_m, exist_ok=True)

def copy_tree(src, dst):
    c = 0
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        tdir = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(tdir, exist_ok=True)
        for f in files:
            sf = os.path.join(root, f)
            df = os.path.join(tdir, f)
            if not os.path.exists(df):
                try:
                    shutil.copyfile(sf, df)
                    c += 1
                except Exception:
                    pass
    return c

# 1. Copy U:/ShellState and X:/Apps/DevHome
print("[+] U:/ShellState copied:", copy_tree("U:/ShellState", "D:/DevelopmentFiles/AllDrives/U_Drive/ShellState"))
print("[+] X:/Apps/DevHome copied:", copy_tree("X:/Apps/DevHome", "D:/DevelopmentFiles/AllDrives/X_Drive/Apps/DevHome"))

# 2. Check all paths in Services, ActivatableClassId, CLSID on M:
candidate_rel_paths = set()

def collect_reg_paths(root, subkey, depth=0):
    if depth > 4:
        return
    try:
        with winreg.OpenKey(root, subkey, 0, winreg.KEY_READ) as k:
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(k, i)
                    if isinstance(val, str):
                        v = val.strip().strip('"')
                        low = v.lower()
                        for prefix in ["m:\\", "c:\\", "%systemroot%\\", "\\systemroot\\", "system32\\"]:
                            idx = low.find(prefix)
                            if idx != -1:
                                part = v[idx:]
                                part = part.split('"')[0].split(" -")[0].split(" /")[0].strip()
                                if low.startswith("%systemroot%\\") or low.startswith("\\systemroot\\"):
                                    rel = "windows\\" + part.split("\\", 1)[1]
                                elif low.startswith("system32\\"):
                                    rel = "windows\\" + part
                                else:
                                    rel = part[3:]
                                candidate_rel_paths.add(rel.replace("\\", "/"))
                    i += 1
                except OSError:
                    break
            j = 0
            while True:
                try:
                    sk = winreg.EnumKey(k, j)
                    collect_reg_paths(root, f"{subkey}\\{sk}", depth + 1)
                    j += 1
                except OSError:
                    break
    except OSError:
        pass

for sk in [
    r"SYSTEM\CurrentControlSet\Services",
    r"SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId",
    r"SOFTWARE\Classes\CLSID",
]:
    collect_reg_paths(winreg.HKEY_LOCAL_MACHINE, sk)

# Also add all relative paths from C:/Windows that we already copied
c_win_base = "D:/DevelopmentFiles/AllDrives/C_Windows"
for root, dirs, files in os.walk(c_win_base):
    rel_dir = os.path.relpath(root, c_win_base).replace("\\", "/")
    for f in files:
        if rel_dir == ".":
            candidate_rel_paths.add(f"windows/{f}")
        else:
            candidate_rel_paths.add(f"windows/{rel_dir}/{f}")

m_copied = 0
m_dirs_listable = set()
for rel in sorted(candidate_rel_paths):
    mp = f"M:/{rel}"
    dparent = os.path.dirname(mp)
    if dparent not in m_dirs_listable:
        try:
            items = os.listdir(dparent)
            m_dirs_listable.add(dparent)
            print(f"[+] Listable M: dir: {dparent} ({len(items)} items)")
        except Exception:
            pass
    try:
        if os.path.isfile(mp):
            out = os.path.join(dst_m, rel)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            if not os.path.exists(out):
                shutil.copyfile(mp, out)
            m_copied += 1
    except Exception:
        pass

print(f"[+] Total M: files verified/copied in D:/DevelopmentFiles/AllDrives/M_Drive: {m_copied}")
