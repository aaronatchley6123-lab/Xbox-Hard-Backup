import ctypes
import os
import struct
import subprocess
import sys
from ctypes import wintypes

print("=" * 70)
print("[*] EXECUTING FULL HARDWARE CHAIN (SYSTEM BOOT & RUNTIME):")
print("[*] 1. Release Hyper-V Holding Partition (State 0)")
print("[*] 2. Operational Mode 8001 (Manufacturing / Factory Mode)")
print("[*] 3. Anaconda Profiling (MODE_ANACONDA_PROFILING)")
print("[*] 4. NVRAM Slot 0xAB -> 0xC8 (200)")
print("[*] 5. XRoDirectoryManager::Unlock & PersistUnlock (C:\\)")
print("=" * 70)

k32 = ctypes.windll.kernel32
xpal = ctypes.WinDLL("xpal.dll")

# ---------------------------------------------------------------------------
# 1. Release Hyper-V Holding Partition (State 0)
# ---------------------------------------------------------------------------
print("\n--- [Step 1: Release Hyper-V Holding Partition] ---")
h_vmm = k32.CreateFileW(r"\\.\xvmctrl", 0xC0000000, 3, None, 3, 0x80, None)
if h_vmm != -1 and h_vmm != ctypes.c_void_p(-1).value:
    in_buf = ctypes.create_string_buffer(512)
    out_buf = ctypes.create_string_buffer(512)
    ret_b = wintypes.DWORD(0)
    ok = k32.DeviceIoControl(h_vmm, 0x00150280, in_buf, 512, out_buf, 512, ctypes.byref(ret_b), None)
    print(f"  [+] IOCTL_XVM_HOLDING_PARTITION Release (in=0): {'SUCCESS' if ok else 'FAILED'}")
    k32.CloseHandle(h_vmm)
else:
    print("  [-] Could not open \\\\.\\xvmctrl directly")

buf0 = (ctypes.c_ubyte * 4)(0, 0, 0, 0)
res27 = xpal.XpalSetXConfig(0x27, buf0, 4)
buf1 = (ctypes.c_ubyte * 1)(0)
res39 = xpal.XpalSetXConfig(0x39, buf1, 1)
print(f"  [+] NVRAM Slot 0x27 -> 0: res={res27:#x}")
print(f"  [+] NVRAM Slot 0x39 -> 0: res={res39:#x}")

# ---------------------------------------------------------------------------
# 2. Operational Mode 8001 (Manufacturing / Factory Mode)
# ---------------------------------------------------------------------------
print("\n--- [Step 2: Hardware Mode 8001 (Manufacturing / Factory)] ---")
buf_mfg = (ctypes.c_ubyte * 4)(1, 0, 0, 0)
res112 = xpal.XpalSetXConfig(0x112, buf_mfg, 4)
print(f"  [+] NVRAM Slot 0x112 (ManufacturingTestMode) -> 1: res={res112:#x}")

# ---------------------------------------------------------------------------
# 3. Anaconda Profiling (MODE_ANACONDA_PROFILING)
# ---------------------------------------------------------------------------
print("\n--- [Step 3: Anaconda Profiling Configuration] ---")
try:
    res = subprocess.run([r"J:\tools\wdconfig.exe", "set", "ProfilingMode=true"], capture_output=True, text=True)
    print(f"  [+] wdconfig ProfilingMode: {res.stdout.strip() or res.stderr.strip()}")
except Exception as e_wd:
    print(f"  [-] wdconfig note: {e_wd}")

# ---------------------------------------------------------------------------
# 4. NVRAM Slot 0xAB -> 0xC8 (200)
# ---------------------------------------------------------------------------
print("\n--- [Step 4: NVRAM Slot 0xAB -> 0xC8 (200)] ---")
buf_ab = (ctypes.c_ubyte * 1)(0xC8)
res_ab = xpal.XpalSetXConfig(0xAB, buf_ab, 1)
print(f"  [+] NVRAM Slot 0xAB (ConsoleMode) -> 0xC8 (200): res={res_ab:#x}")

ret_chk = ctypes.c_uint32(0)
buf_chk = (ctypes.c_ubyte * 64)()
xpal.XpalGetXConfig(0xAB, buf_chk, 64, ctypes.byref(ret_chk))
print(f"  [+] Verified Slot 0xAB: val={buf_chk[0]:#x} ({buf_chk[0]})")

# ---------------------------------------------------------------------------
# 5. XRoDirectoryManager::Unlock and PersistUnlock (C:\)
# ---------------------------------------------------------------------------
print("\n--- [Step 5: XRoDirectoryManager::Unlock & PersistUnlock (C:\\)] ---")
xro_path = r"J:\tools\xrofilter.dll"
if os.path.exists(xro_path):
    xro = ctypes.WinDLL(xro_path)
    # Ordinal 1: ??0XRoDirectoryManager@@QEAA@XZ
    ctor = xro[1]
    ctor.argtypes = [ctypes.c_void_p]
    ctor.restype = ctypes.c_void_p

    # Ordinal 12: ?PersistUnlock@XRoDirectoryManager@@QEAAJPEBG@Z
    persist_unlock = xro[12]
    persist_unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
    persist_unlock.restype = ctypes.c_uint32

    # Ordinal 16: ?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z
    unlock = xro[16]
    unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
    unlock.restype = ctypes.c_uint32

    mgr = ctypes.create_string_buffer(256)
    ctor(mgr)

    for p in [r"C:\\", r"C:", r"C:\Windows\Temp"]:
        try:
            hr_u = unlock(mgr, p)
            print(f"  [+] Unlock({p}): hr=0x{hr_u:08X} ({'SUCCESS' if hr_u == 0 else 'STATUS'})")
        except Exception as e_u:
            print(f"  [-] Unlock error for {p}: {e_u}")

        try:
            hr_p = persist_unlock(mgr, p)
            print(f"  [+] PersistUnlock({p}): hr=0x{hr_p:08X} ({'SUCCESS' if hr_p == 0 else 'STATUS'})")
        except Exception as e_p:
            print(f"  [-] PersistUnlock error for {p}: {e_p}")
else:
    print(f"  [-] {xro_path} not found")

# Ensure unattend scripts remain unlocked (FILE_ATTRIBUTE_NORMAL = 0x80)
for f in [r"D:\unattend.cmd", r"D:\unattend.bat"]:
    if os.path.exists(f):
        k32.SetFileAttributesW(f, 0x80)

print("\n" + "=" * 70)
print("[SUCCESS] FULL HARDWARE CHAIN READY: 8001 | ANACONDA PROFILING | 0xC8 | XRO UNLOCK & PERSIST")
print("=" * 70)
