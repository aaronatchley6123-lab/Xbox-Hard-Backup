import subprocess
import winreg
import json
import ctypes
import struct

print("====================================================")
print("[*] Taking Baseline Pre-Handoff Snapshot (Dev State)...")
print("====================================================")

snapshot = {}

# 1. Capture all 95 XConfig slots
xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

xconfig_slots = {}
for s in range(128):
    buf = (ctypes.c_ubyte * 128)()
    ret = ctypes.c_uint32(0)
    res = fn_get(s, buf, 128, ctypes.byref(ret))
    if res == 0 and ret.value > 0:
        xconfig_slots[f"slot_0x{s:02x}"] = bytes(buf[:ret.value]).hex()
snapshot["xconfig"] = xconfig_slots

# 2. Capture wdconfig export
res_wd = subprocess.run(["J:\\tools\\wdconfig.exe", "export"], capture_output=True, text=True)
snapshot["wdconfig"] = res_wd.stdout.splitlines()

# 3. Capture CPUID leaves
snapshot["cpuid_7"] = {
    "vm_type": hex(xpal.XpalGetVmType()),
    "caps": hex(xpal.XpalGetCapabilities())
}

with open(r"D:\DevelopmentFiles\pre_home_snapshot.json", "w") as f:
    json.dump(snapshot, f, indent=2)

print("[+] Snapshot saved to D:\\DevelopmentFiles\\pre_home_snapshot.json")
print("====================================================")
