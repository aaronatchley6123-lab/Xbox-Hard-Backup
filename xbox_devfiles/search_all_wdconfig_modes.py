import subprocess

res = subprocess.run(["J:\\tools\\wdconfig.exe", "set"], capture_output=True, text=True)
blocks = res.stdout.split("\n\n")

print(f"[*] Scanning all settings with 'Mode' in their name...")
for b in blocks:
    first_line = b.strip().split("\n")[0]
    if "mode" in first_line.lower() or "type" in first_line.lower() or "host" in first_line.lower():
        print("--------------------------------------------------")
        print(b.strip())

