import time
import subprocess
import json
import ctypes
import struct

print("[*] Active Monitoring Daemon Engaged: Watching for State / Mode / Partition Transitions...")

xpal = ctypes.WinDLL("xpal.dll")
fn_get = xpal.XpalGetXConfig
fn_get.restype = ctypes.c_uint32

last_slot_27 = None
last_slot_39 = None
last_mode = None
last_vm = None

# Polling loop
for tick in range(120): # Monitor for up to ~2 minutes
    try:
        # Check slot 0x27
        buf = (ctypes.c_ubyte * 4)()
        ret = ctypes.c_uint32(0)
        fn_get(0x27, buf, 4, ctypes.byref(ret))
        val_27 = struct.unpack("<I", bytes(buf[:4]))[0]

        # Check slot 0x39
        buf_39 = (ctypes.c_ubyte * 1)()
        fn_get(0x39, buf_39, 1, ctypes.byref(ret))
        val_39 = buf_39[0]

        cur_mode = xpal.XpalGetConsoleMode()
        cur_vm = xpal.XpalGetVmType()

        if val_27 != last_slot_27 or val_39 != last_slot_39 or cur_mode != last_mode or cur_vm != last_vm:
            print(f"[!] STATE CHANGE DETECTED at tick {tick}:")
            print(f"    Slot 0x27: {last_slot_27} -> {val_27}")
            print(f"    Slot 0x39: {last_slot_39} -> {val_39}")
            print(f"    ConsoleMode: {hex(last_mode) if last_mode is not None else 'None'} -> {hex(cur_mode)}")
            print(f"    VmType: {hex(last_vm) if last_vm is not None else 'None'} -> {hex(cur_vm)}")
            last_slot_27 = val_27
            last_slot_39 = val_39
            last_mode = cur_mode
            last_vm = cur_vm

    except Exception as e:
        print(f"[-] Monitor error: {e}")

    time.sleep(1)

print("[*] Monitoring window completed.")
