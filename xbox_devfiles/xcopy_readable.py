import os, subprocess

targets = [
    ("D:\\boot", "D:\\DevelopmentFiles\\AllDrives\\D_boot"),
    ("D:\\xbdiag", "D:\\DevelopmentFiles\\AllDrives\\D_xbdiag"),
    ("J:\\tools", "D:\\DevelopmentFiles\\AllDrives\\J_tools"),
]

for src, dst in targets:
    os.makedirs(dst, exist_ok=True)
    cmd = f"xcopy {src}\\* {dst}\\ /E /H /C /I /Y"
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    lines = [l.strip() for l in (p.stdout or "").splitlines() if l.strip()]
    print(f"[+] {src} -> {dst}: {lines[-2:] if lines else p.stderr}")

for root, dirs, files in os.walk("D:/DevelopmentFiles/AllDrives"):
    for f in files:
        fp = os.path.join(root, f)
        print(f"  {fp} ({os.path.getsize(fp)} bytes)")
