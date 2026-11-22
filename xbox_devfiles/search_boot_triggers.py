import subprocess

print("[*] Searching wdconfig for every single boot and startup trigger...")
res = subprocess.run(["J:\\tools\\wdconfig.exe", "set"], capture_output=True, text=True)

triggers = []
for block in res.stdout.split("\n\n"):
    b_low = block.lower()
    if any(k in b_low for k in ["boot", "startup", "launch", "init", "cold", "trigger", "reboot", "autoboot"]):
        triggers.append(block.strip())

print(f"[+] Found {len(triggers)} boot-related settings in wdconfig:")
for t in triggers[:25]:
    print("----------------------------------------------------")
    print(t)

