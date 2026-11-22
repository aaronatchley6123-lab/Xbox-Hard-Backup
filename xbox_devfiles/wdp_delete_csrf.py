import urllib.request, ssl, base64, http.cookiejar

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

auth = base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode()

# Step 1: GET /api/os/info to get CSRF cookie
req1 = urllib.request.Request("https://127.0.0.1:11443/api/os/info")
req1.add_header("Authorization", f"Basic {auth}")
with opener.open(req1) as r1:
    pass

csrf_token = ""
for cookie in cj:
    if "CSRF" in cookie.name.upper() or "TOKEN" in cookie.name.upper():
        csrf_token = cookie.value
        print(f"Found CSRF cookie: {cookie.name}={cookie.value}")

# Step 2: DELETE with CSRF token
req2 = urllib.request.Request("https://127.0.0.1:11443/api/resourcemanager/processes?pid=5520", method="DELETE")
req2.add_header("Authorization", f"Basic {auth}")
if csrf_token:
    req2.add_header("X-CSRF-Token", csrf_token)

try:
    with opener.open(req2) as r2:
        print(f"Delete succeeded! Status: {r2.status}")
except Exception as e:
    print(f"Delete failed: {e}")
