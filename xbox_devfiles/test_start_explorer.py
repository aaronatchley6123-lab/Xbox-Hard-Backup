import subprocess

cmd = r"cmd.exe /c start D:\Windows11\Windows\explorerw.exe"
print(f"Running: {cmd}")
try:
    p = subprocess.Popen(cmd, shell=True)
    print(f"Spawned PID: {p.pid}")
except Exception as e:
    print(f"Error: {e}")
