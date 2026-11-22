import urllib.request
import ssl
import base64

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

auth_header = "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

# 1. Fetch CSRF token from root
req = urllib.request.Request("https://127.0.0.1:11443/")
req.add_header("Authorization", auth_header)
csrf_token = ""
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        cookies = resp.headers.get_all("Set-Cookie") or []
        for c in cookies:
            if "CSRF-Token=" in c:
                csrf_token = c.split("CSRF-Token=")[1].split(";")[0]
        print(f"[WDP] Root CSRF-Token: {csrf_token}")
except Exception as e:
    print(f"[WDP] Root fetch err: {e}")

# 2. Query process list to find DevHome / WWAHost
import json
req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes")
req.add_header("Authorization", auth_header)
if csrf_token:
    req.add_header("X-CSRF-Token", csrf_token)
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode())
        print(f"[WDP] Processes returned: {len(data.get('Processes', []))}")
        for p in data.get('Processes', []):
            name = p.get('ImageName', '')
            if 'WWA' in name or 'DevHome' in name or 'shell' in name.lower() or 'explorer' in name.lower():
                print(f"  Target Process: PID={p.get('ProcessId')} Name={name} PackageName={p.get('PackageFullName')}")
except Exception as e:
    print(f"[WDP] Processes err: {e}")

# 3. Evict package
pkg_b64 = "TWljcm9zb2Z0Llhib3guRGV2SG9tZV8xLjAuMjYwNy4xOTAwMV94NjRfXzh3ZWt5YjNkOGJid2U="
req = urllib.request.Request(f"https://127.0.0.1:11443/api/taskmanager/app?package={pkg_b64}", method="DELETE")
req.add_header("Authorization", auth_header)
if csrf_token:
    req.add_header("X-CSRF-Token", csrf_token)
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        print(f"[WDP] DELETE package status: {resp.status}")
except Exception as e:
    print(f"[WDP] DELETE package err: {e}")
