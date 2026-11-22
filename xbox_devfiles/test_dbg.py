import sys
import os

print(f"Python running: {sys.version}")
print(f"Current PID: {os.getpid()}")

import subprocess
p = subprocess.run([r"D:\Windows11\Windows\explorerw.exe"], capture_output=True, text=True)
print(f"explorerw returncode: {p.returncode}")
print(f"stdout: {p.stdout}")
print(f"stderr: {p.stderr}")
