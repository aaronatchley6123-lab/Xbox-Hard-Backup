import subprocess
import os

print("[*] Probing Windows logon sessions & UserMgr...")
cmd = 'cmd.exe /c "query user || query session"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("Query output:\n", res.stdout)
if res.stderr:
    print("Query stderr:\n", res.stderr)

