import ctypes, os, shutil, string, subprocess

mask = ctypes.windll.kernel32.GetLogicalDrives()
drives = [string.ascii_uppercase[i] for i in range(26) if (mask >> i) & 1]
print("Logical drives:", drives)

base_out = r"D:\DevelopmentFiles\AllDrives"
os.makedirs(base_out, exist_ok=True)

for d in drives:
    root = f"{d}:\\"
    try:
        items = os.listdir(root)
        print(f"[+] {root} -> {items}")
    except Exception as e:
        print(f"[-] {root} root list note: {e}")

    if d in ["D", "Q"]:
        continue

    dst = os.path.join(base_out, f"Drive_{d}")
    os.makedirs(dst, exist_ok=True)
    cmd = f"xcopy {d}:\\* {dst}\\ /E /H /C /I /Y"
    print(f"[*] Running: {cmd}")
    proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    lines = [l.strip() for l in (proc.stdout or "").splitlines() if l.strip()]
    tail = lines[-3:] if lines else []
    print(f"    -> {tail}")
