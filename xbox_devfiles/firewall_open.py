import subprocess
import os

candidates = [
    r"C:\Windows\System32\netsh.exe",
    r"J:\tools\netsh.exe",
    r"D:\DevelopmentFiles\netsh.exe"
]

for c in candidates:
    if os.path.exists(c):
        print("Found:", c)
        res = subprocess.run([c, "advfirewall", "firewall", "add", "rule", "name=HermesBridge", "dir=in", "action=allow", "protocol=TCP", "localport=1984"], capture_output=True, text=True)
        print("Result:", res.stdout, res.stderr)
        break
else:
    print("netsh not found, trying powershell...")
    ps_candidates = [
        r"D:\DevelopmentFiles\powershell\pwsh.exe",
        r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    ]
    for ps in ps_candidates:
        if os.path.exists(ps):
            print("Found PS:", ps)
            res = subprocess.run([ps, "-Command", "New-NetFirewallRule -DisplayName 'HermesBridge' -Direction Inbound -LocalPort 1984 -Protocol TCP -Action Allow"], capture_output=True, text=True)
            print("PS Result:", res.stdout, res.stderr)
            break
