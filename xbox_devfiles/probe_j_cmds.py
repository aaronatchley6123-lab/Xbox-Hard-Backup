import subprocess
for tool in ["wdconfig.exe", "wdapp.exe", "wdrun.exe", "wduser.exe", "wdcred.exe", "wdpanel.exe", "wdrecovery.exe", "xrolock.exe"]:
    try:
        r = subprocess.run(["J:/tools/" + tool, "/?"], capture_output=True, text=True, timeout=3)
        print(f"=== {tool} ===")
        print((r.stdout + r.stderr)[:800])
    except Exception as e:
        print(tool, "ERR:", e)
