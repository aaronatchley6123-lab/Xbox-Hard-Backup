import subprocess, os, time

os.environ["PATH"] = r"D:\Windows11\Windows\System32;D:\Windows11\Windows;" + os.environ.get("PATH", "")

print("Launching explorerw.exe...")
p_exp = subprocess.Popen([r"D:\Windows11\Windows\explorerw.exe"],
                         cwd=r"D:\Windows11\Windows")
print(f"explorerw.exe PID: {p_exp.pid}")

time.sleep(2)

print("Launching notepad.exe...")
p_not = subprocess.Popen([r"D:\Windows11\Windows\System32\notepad.exe"],
                         cwd=r"D:\Windows11\Windows\System32")
print(f"notepad.exe PID: {p_not.pid}")

for i in range(15):
    print(f"[{i*2}s] explorer status: {p_exp.poll()}, notepad status: {p_not.poll()}", flush=True)
    time.sleep(2)

