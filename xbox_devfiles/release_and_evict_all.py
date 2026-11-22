import ctypes
from ctypes import wintypes
import struct
import urllib.request
import ssl
import base64
import json

# 1. HOLDING_PARTITION Release (0x00150280)
kernel32 = ctypes.windll.kernel32
h = kernel32.CreateFileW(r"\\.\xvmctrl", 0xC0000000, 3, None, 3, 0x80, None)
if h and h != -1:
    in_buf = ctypes.create_string_buffer(4)
    struct.pack_into("<I", in_buf, 0, 0)
    bytes_ret = wintypes.DWORD(0)
    ok = kernel32.DeviceIoControl(h, 0x00150280, in_buf, 4, None, 0, ctypes.byref(bytes_ret), None)
    print(f"[VMM] HOLDING_PARTITION Release: {'OK' if ok else f'ERR={ctypes.GetLastError()}'}")
    kernel32.CloseHandle(h)
else:
    print(f"[-] Could not open xvmctrl: ERR={ctypes.GetLastError()}")

# 2. WDP Auth & CSRF
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
auth_header = "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

csrf_token = ""
try:
    req = urllib.request.Request("https://127.0.0.1:11443/")
    req.add_header("Authorization", auth_header)
    with urllib.request.urlopen(req, context=ctx) as resp:
        cookies = resp.headers.get_all("Set-Cookie") or []
        for c in cookies:
            if "CSRF-Token=" in c:
                csrf_token = c.split("CSRF-Token=")[1].split(";")[0]
        print(f"[WDP] CSRF-Token: {csrf_token}")
except Exception as e:
    print(f"[WDP] Token error: {e}")

# Evict packages (DevHome + XBXOwned)
for pkg_b64 in [
    "TWljcm9zb2Z0Llhib3guRGV2SG9tZV8xLjAuMjYwNy4xOTAwMV94NjRfXzh3ZWt5YjNkOGJid2U=", # DevHome
    "WEJYT3duZWQuWGJveERldktpdFN0dWRpb18yLjAuMC4wX3g2NF9fY3pnczExNnJ0djJhcA==" # XBXOwned
]:
    req = urllib.request.Request(f"https://127.0.0.1:11443/api/taskmanager/app?package={pkg_b64}", method="DELETE")
    req.add_header("Authorization", auth_header)
    if csrf_token:
        req.add_header("X-CSRF-Token", csrf_token)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"[WDP] DELETE {pkg_b64[:16]}...: {resp.status}")
    except Exception as e:
        print(f"[WDP] DELETE {pkg_b64[:16]}... err: {e}")
