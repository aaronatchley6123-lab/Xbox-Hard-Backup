import os
import subprocess

print("[*] Inspecting M:\\ (System OS Misc)...")
try:
    entries = os.listdir(r"M:\\")
    print(f"[+] Total entries in M:\\: {len(entries)}")
    for e in entries:
        print(f"    {e}")
except Exception as e:
    print(f"[-] os.listdir('M:\\'): {e}")

# Try via cmd dir
cmd = 'cmd.exe /c "dir /a M:\\"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("[+] cmd dir output:\n", res.stdout)
if res.stderr:
    print("[-] cmd dir stderr:\n", res.stderr)

