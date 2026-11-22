import ctypes
import os
import sys

print("[*] Testing Filesystem Read/Write Status:")

# Test reading C:\
try:
    entries = os.listdir(r"C:\\")
    print(f"[+] os.listdir('C:\\') SUCCESS: {len(entries)} items found: {entries[:8]}")
except Exception as e:
    print(f"[-] os.listdir('C:\\') FAILED: {e}")

# Test writing C:\
test_file = r"C:\test_rw_probe.txt"
try:
    with open(test_file, "w") as f:
        f.write("PROBE_OK")
    print(f"[+] Write to '{test_file}' SUCCESS!")
    if os.path.exists(test_file):
        os.remove(test_file)
        print(f"[+] Delete from '{test_file}' SUCCESS!")
except Exception as e:
    print(f"[-] Write to '{test_file}' failed: {e}")

# Test writing C:\Windows\Temp
temp_file = r"C:\Windows\Temp\test_rw_probe.txt"
try:
    with open(temp_file, "w") as f:
        f.write("TEMP_PROBE_OK")
    print(f"[+] Write to '{temp_file}' SUCCESS!")
    if os.path.exists(temp_file):
        os.remove(temp_file)
        print(f"[+] Delete from '{temp_file}' SUCCESS!")
except Exception as e:
    print(f"[-] Write to '{temp_file}' failed: {e}")

# Test reading and writing D:\
d_file = r"D:\test_rw_probe.txt"
try:
    with open(d_file, "w") as f:
        f.write("D_PROBE_OK")
    print(f"[+] Write to '{d_file}' SUCCESS!")
    if os.path.exists(d_file):
        os.remove(d_file)
        print(f"[+] Delete from '{d_file}' SUCCESS!")
except Exception as e:
    print(f"[-] Write to '{d_file}' failed: {e}")
