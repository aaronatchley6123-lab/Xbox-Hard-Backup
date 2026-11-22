import ctypes
import subprocess
import os

explorer_path = r"D:\Windows11\Windows\explorer.exe"
print(f"[*] Checking explorer.exe at {explorer_path}: {os.path.exists(explorer_path)}")

# Check dependencies via LoadLibrary
k32 = ctypes.windll.kernel32
k32.LoadLibraryA.argtypes = [ctypes.c_char_p]
k32.LoadLibraryA.restype = ctypes.c_void_p

env = os.environ.copy()
env["PATH"] = r"D:\Windows11\Windows\System32;D:\Windows11\Windows;D:\Win11\System32;" + env.get("PATH", "")

print("[*] Spawning explorer.exe...")
try:
    p = subprocess.Popen([explorer_path], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"[+] explorer.exe PID: {p.pid}")
    try:
        out, err = p.communicate(timeout=2)
        print(f"[*] Exited with code {p.returncode}: {out.decode()} {err.decode()}")
    except subprocess.TimeoutExpired:
        print("[+] explorer.exe is RUNNING in background (did not exit immediately)!")
except Exception as e:
    print(f"[-] Execution error: {e}")
