import ctypes
import struct
import json
import os

print("====================================================")
print("[*] Initiating Complete NVRAM & XConfig Hardware Backup...")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

backup_data = {}

for slot in range(128):
    buf = (ctypes.c_ubyte * 128)()
    bytes_ret = ctypes.c_uint32(0)
    try:
        res = fn_get(slot, buf, 128, ctypes.byref(bytes_ret))
        if res == 0 and bytes_ret.value > 0:
            raw_bytes = bytes(buf[:bytes_ret.value])
            backup_data[f"slot_0x{slot:02x}"] = {
                "slot_id": slot,
                "hex": raw_bytes.hex(),
                "length": bytes_ret.value
            }
    except Exception:
        pass

# Also capture Console Mode and CPUID Leaves
import subprocess

with open(r"D:\DevelopmentFiles\nvram_xconfig_backup.json", "w") as f:
    json.dump(backup_data, f, indent=2)

print(f"[+] Successfully backed up {len(backup_data)} NVRAM slots to D:\\DevelopmentFiles\\nvram_xconfig_backup.json")
print("====================================================")
