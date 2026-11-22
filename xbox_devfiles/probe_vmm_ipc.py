import ctypes
from ctypes import wintypes
import os

print("[*] Probing VMM Inter-Partition IPC Devices...")

# Windows NT Named Pipes and MailSlots exposed across VM boundaries
# In Xbox hypervisor: \\Device\\XvmIpc, \\Device\\XvmChannel, \\Device\\HvSocket
CreateFileW = ctypes.windll.kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE

devices = [
    r"\\.\xvmctrl",
    r"\\.\XvmChannel",
    r"\\.\XvmIpc",
    r"\\.\XboxHost",
    r"\\.\HvSocket",
    r"\\.\VMBus",
    r"\\.\XroFilter"
]

for d in devices:
    h = CreateFileW(d, 0xC0000000, 3, None, 3, 0x80, None)
    if h != -1 and h != 0xFFFFFFFFFFFFFFFF:
        print(f"[+] OPENED INTER-VM DEVICE: {d} (handle: {h:#x})")
        ctypes.windll.kernel32.CloseHandle(h)
    else:
        err = ctypes.GetLastError()
        print(f"[-] {d} -> err: {err}")

