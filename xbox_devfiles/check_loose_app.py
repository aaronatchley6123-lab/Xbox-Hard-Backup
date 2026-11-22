import subprocess
import os

wdapp_candidates = [
    r"wdapp.exe",
    r"C:\Windows\System32\wdapp.exe",
    r"D:\DevelopmentFiles\tools\wdapp.exe"
]

# Register unpacked / loose layout directory
# If AppxManifest.xml is unpacked in D:\DevelopmentFiles\LooseApps\pkg
manifest = r"D:\DevelopmentFiles\LooseApps\pkg\AppxManifest.xml"
if os.path.exists(manifest):
    print("Found loose manifest at:", manifest)
    res = subprocess.run(["wdapp", "registerscratch", r"DevelopmentFiles\LooseApps\pkg"], capture_output=True, text=True)
    print("wdapp registerscratch:", res.stdout, res.stderr)
else:
    print("LooseApps pkg manifest not found, creating from HermesUWPApp...")
