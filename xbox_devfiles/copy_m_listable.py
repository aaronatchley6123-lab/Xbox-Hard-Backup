import os, shutil

dst_m = "D:/DevelopmentFiles/AllDrives/M_Drive"

dirs = [
    "M:/windows/System32/OpenSSH",
    "M:/windows/System32/drivers/UMDF",
    "M:/windows/System32/WinBioPlugIns",
    "M:/windows/WebManagement/www/default",
    "M:/windows/DefaultApp",
    "M:/windows/TextInput",
]

copied = 0
for d in dirs:
    try:
        print(f"=== {d}: {os.listdir(d)} ===")
        for root, _, files in os.walk(d):
            for f in files:
                sf = os.path.join(root, f).replace("\\", "/")
                rel = sf[3:]
                out = os.path.join(dst_m, rel)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                try:
                    shutil.copyfile(sf, out)
                    copied += 1
                except Exception:
                    pass
    except Exception as e:
        print(f"Err {d}: {e}")

print(f"[+] Walked listable M: trees -> copied {copied} files")
