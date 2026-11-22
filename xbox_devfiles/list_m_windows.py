import subprocess

cmd = 'cmd.exe /c "dir /s /b M:\\windows"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
lines = [l for l in res.stdout.splitlines() if l.strip()]
print(f"[+] Total files in M:\\windows: {len(lines)}")
for l in lines[:30]:
    print(f"    {l}")

