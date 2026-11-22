import urllib.request, ssl, json, base64

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

auth = base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()
req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes")
req.add_header("Authorization", f"Basic {auth}")

with urllib.request.urlopen(req, context=ctx) as resp:
    data = json.loads(resp.read().decode())
    procs = data.get("Processes", [])
    print(f"Total WDP Processes: {len(procs)}")
    for p in procs:
        name = p.get("ImageName", "")
        pkg = p.get("PackageFullName", "")
        pid = p.get("ProcessId", 0)
        if pkg or any(k in name.lower() for k in ["xbx", "hermes", "explore", "shell"]):
            print(f"PID {pid:5d}: {name} (Pkg: {pkg})")
