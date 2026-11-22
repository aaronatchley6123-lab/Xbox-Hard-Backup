import urllib.request, ssl, base64, json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes")
req.add_header("Authorization", "Basic " + base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode())

try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        procs = json.loads(resp.read().decode()).get('Processes', [])
        print(f"Total processes: {len(procs)}")
        for p in procs:
            # show process name, id, session id, and user
            print(f"{p.get('ProcessId', 0):6d} | Session: {p.get('SessionId', '?')} | Name: {p.get('ImageName', '')} | User: {p.get('UserName', '')}")
except Exception as e:
    print(f"Error: {e}")
