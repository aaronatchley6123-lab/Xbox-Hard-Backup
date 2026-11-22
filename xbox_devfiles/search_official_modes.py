import subprocess
import os

print("[*] Probing X:\\ht and system binaries for official HostOS/System mode...")

# List X:\ht
if os.path.exists(r"X:\ht"):
    try:
        entries = os.listdir(r"X:\ht")
        print(f"[+] Files in X:\\ht ({len(entries)}):")
        for e in entries:
            print(f"    {e}")
    except Exception as ex:
        print(f"[-] X:\\ht error: {ex}")

# Check ConsoleMode accepted values in wdconfig
res = subprocess.run(["J:\\tools\\wdconfig.exe", "set", "ConsoleMode"], capture_output=True, text=True)
print("\n[+] ConsoleMode:\n", res.stdout)

# Check ConsoleType accepted values in wdconfig
res_type = subprocess.run(["J:\\tools\\wdconfig.exe", "set", "ConsoleType"], capture_output=True, text=True)
print("\n[+] ConsoleType:\n", res_type.stdout)

