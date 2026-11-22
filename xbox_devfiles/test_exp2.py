import subprocess, time, sys, os

print("Starting explorerw.exe test runner...")
os.environ["PATH"] = r"D:\Windows11\Windows\System32;D:\Windows11\Windows;" + os.environ.get("PATH", "")

t0 = time.time()
p = subprocess.Popen([r"D:\Windows11\Windows\explorerw.exe"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print(f"Spawned PID {p.pid}")

while True:
    ret = p.poll()
    elapsed = time.time() - t0
    if ret is not None:
        print(f"Process exited after {elapsed:.2f} seconds with code: {ret}")
        stdout, stderr = p.communicate()
        print(f"Stdout: {stdout.decode(errors='replace')}")
        print(f"Stderr: {stderr.decode(errors='replace')}")
        break
    if elapsed > 15:
        print(f"Process is STILL RUNNING after {elapsed:.2f} seconds!")
        break
    time.sleep(0.5)

