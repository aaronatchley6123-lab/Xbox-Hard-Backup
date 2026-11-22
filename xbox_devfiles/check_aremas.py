import ctypes, os
from ctypes import wintypes

# 1. Check Win32 QueryDosDevice for XvsMaster
buf = ctypes.create_unicode_buffer(4096)
ret = ctypes.windll.kernel32.QueryDosDeviceW("K:", buf, 4096)
print(f"QueryDosDevice(K:): ret={ret}, target='{buf.value}'")

# 2. Check all DosDevices containing 'aremas' or 'xvs' or 'hermes'
all_devs = ctypes.create_unicode_buffer(65536)
ret_all = ctypes.windll.kernel32.QueryDosDeviceW(None, all_devs, 65536)
if ret_all > 0:
    chars = all_devs[:ret_all]
    dev_list = [d for d in chars.split('\x00') if d]
    print(f"Total DosDevices: {len(dev_list)}")
    for d in dev_list:
        target = ctypes.create_unicode_buffer(1024)
        ctypes.windll.kernel32.QueryDosDeviceW(d, target, 1024)
        t_val = target.value.lower()
        if any(k in d.lower() or k in t_val for k in ['aremas', 'xvs', 'hermes', 'master', 'slot']):
            print(f"  {d:20s} -> {target.value}")

# 3. Check S:\HermesGuard
hg_path = r"S:\HermesGuard"
if os.path.exists(hg_path):
    print(f"\n=== Contents of {hg_path} ===")
    try:
        for root, dirs, files in os.walk(hg_path):
            for f in files:
                print(" ", os.path.join(root, f))
    except Exception as e:
        print("  Error walking HermesGuard:", e)

