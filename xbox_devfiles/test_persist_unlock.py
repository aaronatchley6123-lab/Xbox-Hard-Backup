import ctypes
import os
import sys

print("[*] Testing XRoDirectoryManager::PersistUnlock and Unlock...")

xro = ctypes.WinDLL(r"J:\tools\xrofilter.dll")

# Ordinals:
# 1: ??0XRoDirectoryManager@@QEAA@XZ (constructor)
# 3: ??1XRoDirectoryManager@@QEAA@XZ (destructor)
# 12: ?PersistUnlock@XRoDirectoryManager@@QEAAJPEBG@Z
# 16: ?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z

ctor = xro[1]
ctor.argtypes = [ctypes.c_void_p]
ctor.restype = ctypes.c_void_p

persist_unlock = xro[12]
persist_unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
persist_unlock.restype = ctypes.c_uint32

unlock = xro[16]
unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
unlock.restype = ctypes.c_uint32

mgr = ctypes.create_string_buffer(256)
ctor(mgr)

for target in [r"C:\\", r"C:", r"C:\Windows\Temp"]:
    hr_unlock = unlock(mgr, target)
    print(f"[+] Unlock('{target}'): hr = 0x{hr_unlock:08X}")
    try:
        hr_persist = persist_unlock(mgr, target)
        print(f"[+] PersistUnlock('{target}'): hr = 0x{hr_persist:08X}")
    except Exception as e:
        print(f"[-] PersistUnlock('{target}') error: {e}")

# Check registry key now
import winreg
try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"OSDATA\XTF\XRO\UnlockedForReboot")
    print("[+] Successfully opened HKLM\\OSDATA\\XTF\\XRO\\UnlockedForReboot!")
    i = 0
    while True:
        try:
            name, val, typ = winreg.EnumValue(k, i)
            print(f"    Val {i}: {name} = {val} ({typ})")
            i += 1
        except OSError:
            break
except Exception as e_reg:
    print(f"[-] Reg check: {e_reg}")
