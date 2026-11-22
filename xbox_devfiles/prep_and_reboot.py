import winreg, ctypes
from ctypes import wintypes
import urllib.request, ssl, base64

xpal = ctypes.windll.LoadLibrary("xpal.dll")
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG

# 1. Verify Slot 0xAB
buf = (ctypes.c_ubyte * 16)()
ret_bytes = wintypes.ULONG(0)
status = XpalGetXConfig(0xAB, buf, 16, ctypes.byref(ret_bytes))
val = bytes(buf[:ret_bytes.value])
print(f"[Check] NVRAM Slot 0xAB: {val.hex()} (status={status})")

# 2. Verify HKLM ConsoleMode
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig\ConsoleMode") as k:
        data, typ = winreg.QueryValueEx(k, "Version1")
        print(f"[Check] Registry ConsoleMode: {bytes(data).hex()}")
except Exception as e:
    print(f"[Check] Registry ConsoleMode error: {e}")

# 3. Trigger clean reboot via WDP
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
auth = "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

# Get CSRF
req = urllib.request.Request("https://127.0.0.1:11443/")
req.add_header("Authorization", auth)
csrf = ""
with urllib.request.urlopen(req, context=ctx) as r:
    for c in r.headers.get_all("Set-Cookie") or []:
        if "CSRF-Token=" in c:
            csrf = c.split("CSRF-Token=")[1].split(";")[0]

print(f"[Reboot] Triggering restart via WDP with CSRF...")
req_restart = urllib.request.Request("https://127.0.0.1:11443/api/control/restart", data=b"", method="POST")
req_restart.add_header("Authorization", auth)
if csrf:
    req_restart.add_header("X-CSRF-Token", csrf)

with urllib.request.urlopen(req_restart, context=ctx) as r:
    print(f"[Reboot] WDP Restart response: {r.status}")
