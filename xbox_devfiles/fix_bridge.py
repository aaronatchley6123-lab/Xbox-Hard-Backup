with open(r"D:\DevelopmentFiles\hermes_bridge.py", "r", encoding="utf-8") as f:
    text = f.read()

# Remove the broken header
broken_header = """# Define persistent W: DOS device mapping to D:\\Windows11
try:
    k32 = ctypes.windll.kernel32
    k32.DefineDosDeviceW(0, "W:", r"\\??\\D:\\Windows")
    print("[+] W: drive defined in bridge mapping to D:\\Windows11", flush=True)
except Exception as e_w:
    print(f"[-] DefineDosDeviceW note: {e_w}", flush=True)
"""

if broken_header in text:
    text = text.replace(broken_header, "")

clean_header = """import ctypes
from ctypes import wintypes
import os
import socket
import struct
import subprocess
import sys
import threading
import time

# Define persistent W: DOS device mapping to D:\\Windows
try:
    k32 = ctypes.windll.kernel32
    # DDD_RAW_TARGET_PATH = 1
    k32.DefineDosDeviceW(1, "W:", r"\\??\\D:\\Windows")
    print("[+] W: drive defined in bridge mapping to D:\\\\Windows", flush=True)
except Exception as e_w:
    print(f"[-] DefineDosDeviceW note: {e_w}", flush=True)
"""

# Replace top imports with clean header
text = text.replace("""import ctypes
from ctypes import wintypes
import os
import socket
import struct
import subprocess
import sys
import threading
import time""", clean_header)

with open(r"D:\DevelopmentFiles\hermes_bridge.py", "w", encoding="utf-8") as f:
    f.write(text)

print("[+] Hermes Bridge fixed successfully.")
