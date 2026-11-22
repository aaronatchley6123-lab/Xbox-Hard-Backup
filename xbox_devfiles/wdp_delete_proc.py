import urllib.request, ssl, base64

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

auth = base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()
req = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes?pid=5520", method="DELETE")
req.add_header("Authorization", f"Basic {auth}")

try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        print(f"WDP DELETE response: {resp.status} {resp.read().decode()}")
except Exception as e:
    print(f"WDP DELETE error: {e}")
