import os
import string
import ctypes

kernel32 = ctypes.windll.kernel32
bitmask = kernel32.GetLogicalDrives()
drives = [f"{letter}:\\" for i, letter in enumerate(string.ascii_uppercase) if (bitmask & (1 << i))]
print("Logical Drives:", drives)

types = {0: "Unknown", 1: "NoRoot", 2: "Removable/USB", 3: "Fixed", 4: "Remote", 5: "CDROM", 6: "RAMDisk"}
for d in drives:
    dtype = kernel32.GetDriveTypeW(d)
    name = types.get(dtype, str(dtype))
    print(f"\nDrive {d} [{name}]:")
    try:
        items = os.listdir(d)
        print(f"  Count: {len(items)} items")
        print("  Sample:", items[:25])
        # Look for launcher or exe
        launchers = [x for x in items if "launch" in x.lower() or x.lower().endswith(".exe") or x.lower().endswith(".bat") or x.lower().endswith(".cmd")]
        if launchers:
            print(f"  --> Potential Launchers: {launchers}")
    except Exception as e:
        print(f"  Cannot list {d}: {e}")
