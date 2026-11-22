import subprocess

out = subprocess.check_output(["sc", "query", "type=", "service", "state=", "all"], shell=True, text=True)
print("Services matching Broker, Dev, or Unattended:")
for line in out.splitlines():
    if "SERVICE_NAME" in line or "DISPLAY_NAME" in line:
        if any(k in line.lower() for k in ["broker", "dev", "unattend", "manu", "ssh", "xbla", "sra"]):
            print(" ", line.strip())
