import ctypes
import os
import subprocess

ps_exe = r"D:\Windows11\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"

# Test loading mscoree.dll from D:\Windows11\Windows\System32\mscoree.dll
mscoree_path = r"D:\Windows11\Windows\System32\mscoree.dll"
h_mscoree = ctypes.windll.kernel32.LoadLibraryW(mscoree_path)
print(f"[*] LoadLibraryW('{mscoree_path}'): {h_mscoree} (LastError: {ctypes.windll.kernel32.GetLastError()})")

# Test loading powershell imports
k32 = ctypes.windll.kernel32
for dll in ["msvcrt.dll", "ATL.DLL", "KERNEL32.dll", "OLEAUT32.dll", "ADVAPI32.dll", "OLE32.dll", "USER32.dll", "mscoree.dll"]:
    h = k32.LoadLibraryA(dll.encode())
    print(f"  LoadLibrary({dll}): {h} (err: {k32.GetLastError()})")

# Run powershell and capture returncode
p = subprocess.run([ps_exe, "-NoProfile", "-Command", "Write-Host 'Test'"], capture_output=True, text=True)
print(f"[*] Subprocess returncode: {p.returncode} ({hex(p.returncode & 0xffffffff)})")
print(f"[*] Stdout: {p.stdout}")
print(f"[*] Stderr: {p.stderr}")
