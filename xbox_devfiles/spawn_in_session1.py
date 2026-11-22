import ctypes
from ctypes import wintypes
import os

kernel32 = ctypes.windll.kernel32
advapi32 = ctypes.windll.advapi32
user32 = ctypes.windll.user32

TOKEN_DUPLICATE = 0x0002
TOKEN_QUERY = 0x0008
TOKEN_ASSIGN_PRIMARY = 0x0001
TOKEN_ADJUST_DEFAULT = 0x0080
TOKEN_ADJUST_SESSIONID = 0x0100
MAXIMUM_ALLOWED = 0x02000000

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("hProcess", wintypes.HANDLE),
        ("hThread", wintypes.HANDLE),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD)
    ]

class STARTUPINFO(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("lpReserved", wintypes.LPWSTR),
        ("lpDesktop", wintypes.LPWSTR),
        ("lpTitle", wintypes.LPWSTR),
        ("dwX", wintypes.DWORD),
        ("dwY", wintypes.DWORD),
        ("dwXSize", wintypes.DWORD),
        ("dwYSize", wintypes.DWORD),
        ("dwXCountChars", wintypes.DWORD),
        ("dwYCountChars", wintypes.DWORD),
        ("dwFillAttribute", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("wShowWindow", wintypes.WORD),
        ("cbReserved2", wintypes.WORD),
        ("lpReserved2", ctypes.POINTER(wintypes.BYTE)),
        ("hStdInput", wintypes.HANDLE),
        ("hStdOutput", wintypes.HANDLE),
        ("hStdError", wintypes.HANDLE)
    ]

# Find a process running in DefaultAccount interactive session (e.g., sihost.exe or XboxUI.exe)
import urllib.request, ssl, base64, json
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes")
req.add_header("Authorization", "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode())

target_pid = None
with urllib.request.urlopen(req, context=ctx) as resp:
    procs = json.loads(resp.read().decode()).get('Processes', [])
    for p in procs:
        if p.get('ImageName') in ['sihost.exe', 'XboxUI.exe', 'Settings.exe']:
            target_pid = p.get('ProcessId')
            print(f"[*] Found target process: {p.get('ImageName')} (PID {target_pid})")
            break

if not target_pid:
    print("[-] Could not find target interactive process.")
    exit(1)

# Open process and token
hProcess = kernel32.OpenProcess(0x1000 | 0x0400, False, target_pid)
if not hProcess:
    print(f"[-] OpenProcess failed: {kernel32.GetLastError()}")
    exit(1)

hToken = wintypes.HANDLE()
if not advapi32.OpenProcessToken(hProcess, MAXIMUM_ALLOWED, ctypes.byref(hToken)):
    print(f"[-] OpenProcessToken failed: {kernel32.GetLastError()}")
    kernel32.CloseHandle(hProcess)
    exit(1)

hDupToken = wintypes.HANDLE()
class SECURITY_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("nLength", wintypes.DWORD), ("lpSecurityDescriptor", wintypes.LPVOID), ("bInheritHandle", wintypes.BOOL)]

sa = SECURITY_ATTRIBUTES()
sa.nLength = ctypes.sizeof(sa)
sa.bInheritHandle = False

if not advapi32.DuplicateTokenEx(hToken, MAXIMUM_ALLOWED, ctypes.byref(sa), 2, 1, ctypes.byref(hDupToken)):
    print(f"[-] DuplicateTokenEx failed: {kernel32.GetLastError()}")
    kernel32.CloseHandle(hToken)
    kernel32.CloseHandle(hProcess)
    exit(1)

print("[+] Duplicated interactive session token successfully.")

si = STARTUPINFO()
si.cb = ctypes.sizeof(si)
si.lpDesktop = r"winsta0\default"
pi = PROCESS_INFORMATION()

cmdline = r"D:\Windows11\Windows\explorerw.exe"
print(f"[*] Calling CreateProcessAsUser with {cmdline} into winsta0\\default...")

res = advapi32.CreateProcessAsUserW(
    hDupToken,
    None,
    cmdline,
    None,
    None,
    False,
    0,
    None,
    r"D:\Windows11\Windows",
    ctypes.byref(si),
    ctypes.byref(pi)
)

if res:
    print(f"[+] CreateProcessAsUser SUCCEEDED! Spawned PID: {pi.dwProcessId}")
    kernel32.CloseHandle(pi.hProcess)
    kernel32.CloseHandle(pi.hThread)
else:
    err = kernel32.GetLastError()
    print(f"[-] CreateProcessAsUser failed with error code: {err}")

kernel32.CloseHandle(hDupToken)
kernel32.CloseHandle(hToken)
kernel32.CloseHandle(hProcess)
