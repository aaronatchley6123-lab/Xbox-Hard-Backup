import subprocess
for tool in ["wdconfig.exe", "wdapp.exe", "wduser.exe", "wdcred.exe", "wdpanel.exe", "wdrecovery.exe", "wdcapture.exe", "wdtrace.exe"]:
    try:
        r = subprocess.run(["J:/tools/" + tool, "commands", "/?"], capture_output=True, text=True, timeout=3)
        print(f"=== {tool} commands /? ===")
        lines = [l.strip() for l in (r.stdout + r.stderr).splitlines() if l.strip()]
        print("\n".join(lines))
    except Exception as e:
        print(tool, "ERR:", e)
