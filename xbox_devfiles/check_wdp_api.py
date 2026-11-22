import urllib.request, ssl, base64, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
auth = "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

endpoints = [
    "/api/os/info",
    "/api/control/process",
    "/api/sysmgmt/components",
    "/api/command/run",
    "/api/command/exec",
    "/api/tools/run",
    "/api/registry",
    "/api/taskmanager/process",
    "/api/app/packagemanager/packages",
    "/api/filesystem/apps/file"
]

for ep in endpoints:
    req = urllib.request.Request("https://127.0.0.1:11443" + ep)
    req.add_header("Authorization", auth)
    try:
        with urllib.request.urlopen(req, context=ctx) as r:
            print(f"{ep:35s} -> {r.status}")
    except urllib.error.HTTPError as e:
        print(f"{ep:35s} -> HTTP {e.code}")
    except Exception as e:
        print(f"{ep:35s} -> {e}")
