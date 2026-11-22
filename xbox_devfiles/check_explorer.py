import subprocess
import os
import sys

os.environ["PATH"] = r"D:\Windows\System32;D:\Windows;" + os.environ.get("PATH", "")
os.environ["WINDIR"] = r"D:\Windows"
os.environ["SYSTEMROOT"] = r"D:\Windows"

print("Testing CreateProcess on D:\\Windows\\explorer.exe ...")
try:
    p = subprocess.Popen([r"D:\Windows\explorer.exe"], env=os.environ)
    print(f"Spawned explorer.exe PID={p.pid}")
    try:
        ret = p.wait(timeout=3)
        print(f"Explorer exited immediately with code: {ret} (hex: {hex(ret & 0xFFFFFFFF) if ret is not None else 'None'})")
    except subprocess.TimeoutExpired:
        print("Explorer is still running after 3 seconds!")
except Exception as e:
    print(f"Error launching: {e}")
