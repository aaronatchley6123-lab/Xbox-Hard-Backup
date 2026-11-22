import subprocess, time, sys, os

print("Testing explorerw.exe launch...")
os.environ["PATH"] = r"D:\Windows11\Windows\System32;D:\Windows11\Windows;" + os.environ.get("PATH", "")

try:
    p = subprocess.Popen([r"D:\Windows11\Windows\explorerw.exe"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"Spawned explorerw.exe with PID {p.pid}")
    time.sleep(3)
    ret = p.poll()
    print(f"Poll result after 3 seconds: {ret}")
    if ret is not None:
        stdout, stderr = p.communicate()
        print(f"Stdout: {stdout.decode(errors='replace')}")
        print(f"Stderr: {stderr.decode(errors='replace')}")
except Exception as e:
    print(f"Exception: {e}")
