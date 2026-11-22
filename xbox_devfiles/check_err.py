
import urllib.request, ssl, json, os, glob

ctx = ssl._create_unverified_context()
try:
    with urllib.request.urlopen("https://127.0.0.1:11443/api/debug/dump/usermode/dumps", timeout=3, context=ctx) as r:
        dumps = json.loads(r.read().decode())
        print("WDP Crash Dumps:", dumps)
except Exception as e:
    print("Crash dumps query error:", e)

# Check recent files in D:\DevelopmentFiles
files = [os.path.join(r"D:\DevelopmentFiles", f) for f in os.listdir(r"D:\DevelopmentFiles")]
files.sort(key=os.path.getmtime, reverse=True)
for f in files[:10]:
    sz = os.path.getsize(f)
    print(f"Recent: {os.path.basename(f)} ({sz} bytes)")
