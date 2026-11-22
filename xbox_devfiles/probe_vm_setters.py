import ctypes
import os

xpal = ctypes.WinDLL("xpal.dll")
print("[*] Probing xpal and ntdll for VmType or Partition switching functions...")

# Search for any function with "set", "switch", "vm", "partition", "mode" in xpal
for exp in dir(xpal):
    l = exp.lower()
    if any(k in l for k in ["set", "switch", "mode", "vm", "partition", "transition"]):
        print(f"  xpal: {exp}")

# Check ntdll / kernelbase for Xbox specific syscalls
ntdll = ctypes.WinDLL("ntdll.dll")
for exp in dir(ntdll):
    l = exp.lower()
    if any(k in l for k in ["xbox", "vmm", "partition"]):
        print(f"  ntdll: {exp}")

