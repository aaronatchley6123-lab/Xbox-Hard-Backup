import urllib.request, ssl, base64, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
auth_header = "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

# 1. CSRF
req = urllib.request.Request("https://127.0.0.1:11443/")
req.add_header("Authorization", auth_header)
csrf_token = ""
with urllib.request.urlopen(req, context=ctx) as resp:
    for c in resp.headers.get_all("Set-Cookie") or []:
        if "CSRF-Token=" in c:
            csrf_token = c.split("CSRF-Token=")[1].split(";")[0]

# 2. Get processes to find HermesOS
req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes")
req.add_header("Authorization", auth_header)
with urllib.request.urlopen(req, context=ctx) as resp:
    procs = json.loads(resp.read().decode()).get('Processes', [])
    for p in procs:
        pkg = p.get('PackageFullName', '')
        if 'Hermes' in pkg:
            print(f"[*] Found Hermes package: {pkg}")
            # Base64 encode package name
            pkg_b64 = base64.b64encode(pkg.encode()).decode()
            del_req = urllib.request.Request(f"https://127.0.0.1:11443/api/taskmanager/app?package={pkg_b64}", method="DELETE")
            del_req.add_header("Authorization", auth_header)
            del_req.add_header("X-CSRF-Token", csrf_token)
            try:
                with urllib.request.urlopen(del_req, context=ctx) as del_resp:
                    print(f"[+] Terminated {pkg}: {del_resp.status}")
            except Exception as e:
                print(f"[-] Terminate err: {e}")
