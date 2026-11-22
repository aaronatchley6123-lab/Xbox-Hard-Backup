import os, shutil, winreg

m_paths = set()

def scan_reg(root, subkey, depth=0):
    if depth > 5:
        return
    try:
        with winreg.OpenKey(root, subkey, 0, winreg.KEY_READ) as k:
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(k, i)
                    if isinstance(val, str) and ("m:\\" in val.lower() or "m:/" in val.lower()):
                        m_paths.add(val)
                    i += 1
                except OSError:
                    break
            j = 0
            while True:
                try:
                    sk = winreg.EnumKey(k, j)
                    scan_reg(root, f"{subkey}\\{sk}" if subkey else sk, depth + 1)
                    j += 1
                except OSError:
                    break
    except OSError:
        pass

for sk in [
    r"SYSTEM\CurrentControlSet\Services",
    r"SOFTWARE\Microsoft\WindowsRuntime\ActivatableClassId",
    r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Svchost",
    r"SOFTWARE\Microsoft\Xbox",
    r"SOFTWARE\Classes\CLSID",
]:
    scan_reg(winreg.HKEY_LOCAL_MACHINE, sk)

print(f"[+] Found {len(m_paths)} M: references in registry:")
clean_files = set()
clean_dirs = set()
q = chr(34)
for raw in sorted(m_paths):
    print("  REG:", raw)
    idx = raw.lower().find("m:\\")
    if idx >= 0:
        sub = raw[idx:].split(q)[0].split(" ")[0].strip()
        clean_files.add(sub)
        clean_dirs.add(os.path.dirname(sub))

dst_base = "D:/DevelopmentFiles/AllDrives/M_Drive"
copied = 0
for f in sorted(clean_files):
    norm = f.replace("\\", "/")
    if os.path.isfile(norm):
        rel = norm[3:]
        out = os.path.join(dst_base, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        try:
            shutil.copyfile(norm, out)
            copied += 1
        except Exception:
            pass

for d in sorted(clean_dirs):
    norm = d.replace("\\", "/")
    if os.path.isdir(norm):
        try:
            items = os.listdir(norm)
            print(f"[+] LISTABLE M: DIR {norm} ({len(items)} items): {items[:15]}")
            for root_d, dirs_d, files_d in os.walk(norm):
                for fn in files_d:
                    sf = os.path.join(root_d, fn).replace("\\", "/")
                    rel = sf[3:]
                    out = os.path.join(dst_base, rel)
                    os.makedirs(os.path.dirname(out), exist_ok=True)
                    try:
                        shutil.copyfile(sf, out)
                        copied += 1
                    except Exception:
                        pass
        except Exception:
            pass

print(f"[+] Total additional M: items copied: {copied}")
