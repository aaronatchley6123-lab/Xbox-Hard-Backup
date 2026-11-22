import subprocess
import re

res = subprocess.run(["J:\\tools\\wdconfig.exe", "export"], capture_output=True, text=True)
for line in res.stdout.splitlines():
    if any(k in line.lower() for k in ["dev", "retail", "home", "mode", "app", "type", "shell", "console"]):
        print(line)

