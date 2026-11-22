import os
import hashlib
import base64
import zipfile
import subprocess
import urllib.request
import ssl
import time

PKG_DIR = "/home/<USER>/Hermes_Xbox_Package/pkg"
OUTPUT_MSIX = "/home/<USER>/Hermes_Xbox_Package/HermesOS_SeriesX.msix"
CERT_PATH = "/home/<USER>/AgentCouture_AAA/<REDACTED_CERT>"
KEY_PATH = "/home/<USER>/AgentCouture_AAA/<REDACTED_CERT>"
XBOX_IP = "<LAN_IP>"

print("=========================================================")
print("Packaging & Signing Hermes Agent OS Game-Tier MSIX")
print("=========================================================")

# 1. Generate [Content_Types].xml
content_types = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/vnd.ms-appx.manifest+xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="exe" ContentType="application/x-msdownload"/>
  <Default Extension="p7x" ContentType="application/vnd.ms-appx.signature"/>
  <Override PartName="/AppxBlockMap.xml" ContentType="application/vnd.ms-appx.blockmap+xml"/>
  <Override PartName="/AppxManifest.xml" ContentType="application/vnd.ms-appx.manifest+xml"/>
  <Override PartName="/AppxSignature.p7x" ContentType="application/vnd.ms-appx.signature"/>
</Types>
"""
with open(os.path.join(PKG_DIR, "[Content_Types].xml"), "w", encoding="utf-8") as f:
    f.write(content_types.strip())

# 2. Compute 64KB block SHA256 hashes for AppxBlockMap.xml
BLOCK_SIZE = 65536
files_to_hash = []
for root, dirs, files in os.walk(PKG_DIR):
    for f in sorted(files):
        if f in ("AppxBlockMap.xml", "[Content_Types].xml", "AppxSignature.p7x"):
            continue
        rel = os.path.relpath(os.path.join(root, f), PKG_DIR).replace("/", "\\")
        files_to_hash.append((rel, os.path.join(root, f)))

blockmap_entries = []
for rel_path, full_path in files_to_hash:
    file_size = os.path.getsize(full_path)
    lfh_size = 30 + len(rel_path.replace("\\", "/"))
    blocks = []
    with open(full_path, "rb") as fp:
        while True:
            chunk = fp.read(BLOCK_SIZE)
            if not chunk: break
            b_hash = base64.b64encode(hashlib.sha256(chunk).digest()).decode('ascii')
            blocks.append(f'    <Block Hash="{b_hash}"/>')
    if not blocks:
        empty_hash = base64.b64encode(hashlib.sha256(b"").digest()).decode('ascii')
        blocks.append(f'    <Block Hash="{empty_hash}"/>')

    blockmap_entries.append(
        f'  <File Name="{rel_path}" Size="{file_size}" LfhSize="{lfh_size}">\n' +
        "\n".join(blocks) +
        "\n  </File>"
    )

blockmap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<BlockMap HashMethod="http://www.w3.org/2001/04/xmlenc#sha256" xmlns="http://schemas.microsoft.com/appx/2010/blockmap">
{chr(10).join(blockmap_entries)}
</BlockMap>
"""
with open(os.path.join(PKG_DIR, "AppxBlockMap.xml"), "w", encoding="utf-8") as f:
    f.write(blockmap_xml.strip())
print(f"[+] Computed AppxBlockMap.xml for {len(files_to_hash)} files.")

# 3. Sign using OpenSSL PKCS#7
sig_path = os.path.join(PKG_DIR, "AppxSignature.p7x")
subprocess.run([
    "openssl", "smime", "-sign",
    "-in", os.path.join(PKG_DIR, "AppxBlockMap.xml"),
    "-out", sig_path,
    "-outform", "DER",
    "-signer", CERT_PATH,
    "-inkey", KEY_PATH,
    "-binary"
], check=True)
print(f"[+] Signed AppxSignature.p7x with {CERT_PATH}!")

# 4. Pack into MSIX ZIP archive
if os.path.exists(OUTPUT_MSIX):
    os.remove(OUTPUT_MSIX)

with zipfile.ZipFile(OUTPUT_MSIX, "w", zipfile.ZIP_DEFLATED) as zf:
    for special in ("[Content_Types].xml", "AppxManifest.xml", "AppxBlockMap.xml"):
        p = os.path.join(PKG_DIR, special)
        if os.path.exists(p):
            zf.write(p, arcname=special)
    for root, dirs, files in os.walk(PKG_DIR):
        for f in files:
            if f in ("[Content_Types].xml", "AppxManifest.xml", "AppxBlockMap.xml", "AppxSignature.p7x"):
                continue
            fp = os.path.join(root, f)
            arc = os.path.relpath(fp, PKG_DIR).replace("\\", "/")
            zf.write(fp, arcname=arc)
    if os.path.exists(sig_path):
        zf.write(sig_path, arcname="AppxSignature.p7x")

sz_mb = os.path.getsize(OUTPUT_MSIX) / (1024 * 1024)
print(f"[+] Generated MSIX: {OUTPUT_MSIX} ({sz_mb:.2f} MB)")

# 5. Deploy to Xbox Device Portal
print(f"\n[Deploying to Xbox Series X @ {XBOX_IP}:11443]...")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
creds = base64.b64encode(b"DevToolsUser:<REDACTED_PASSWORD>").decode("ascii")

# Get CSRF
req_home = urllib.request.Request(f"https://{XBOX_IP}:11443/")
req_home.add_header("Authorization", f"Basic {creds}")
with urllib.request.urlopen(req_home, context=ctx, timeout=5) as resp:
    csrf = resp.headers.get("Set-Cookie").split("CSRF-Token=")[1].split(";")[0]

pkg_name = os.path.basename(OUTPUT_MSIX)
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body_header = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="{pkg_name}"; filename="{pkg_name}"\r\n'
    f'Content-Type: application/octet-stream\r\n\r\n'
).encode("utf-8")
body_footer = f'\r\n--{boundary}--\r\n'.encode("utf-8")

with open(OUTPUT_MSIX, "rb") as f:
    pkg_data = f.read()

payload = body_header + pkg_data + body_footer
deploy_url = f"https://{XBOX_IP}:11443/api/app/packagemanager/package?package={pkg_name}"
req_deploy = urllib.request.Request(deploy_url, data=payload, method="POST")
req_deploy.add_header("Authorization", f"Basic {creds}")
req_deploy.add_header("X-CSRF-Token", csrf)
req_deploy.add_header("Cookie", f"CSRF-Token={csrf}")
req_deploy.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

try:
    with urllib.request.urlopen(req_deploy, context=ctx, timeout=30) as r:
        print("Deploy Request Accepted:", r.status, r.read().decode())
except urllib.error.HTTPError as e:
    print(f"Deploy HTTPError {e.code}: {e.read().decode()}")

# 6. Monitor Installation State
print("\nMonitoring installation progress on Xbox...")
state_url = f"https://{XBOX_IP}:11443/api/app/packagemanager/state"
req_state = urllib.request.Request(state_url)
req_state.add_header("Authorization", f"Basic {creds}")

for attempt in range(10):
    time.sleep(2)
    with urllib.request.urlopen(req_state, context=ctx, timeout=5) as r:
        import json
        st = json.loads(r.read().decode())
        print(f"  Attempt {attempt+1}: {st}")
        if st.get("Success") is True:
            print("\n[🎉 INSTALLATION COMPLETE!]")
            print(f"Hermes Agent OS is now installed on the Xbox Series X Devkit!")
            break
        elif st.get("Code") != 0 and st.get("Code") is not None:
            print(f"Installation ended with state: {st}")
            break
