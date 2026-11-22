import subprocess
import os

print("[*] Probing system sleep/wake/power APIs and commands...")

# Check powercfg
try:
    res = subprocess.run(["powercfg", "/?"], capture_output=True, text=True)
    print("[+] powercfg output:")
    print(res.stdout[:500])
except Exception as e:
    print(f"[-] powercfg: {e}")

# Check sracmd SuspendEra / ResumeEra / Park
try:
    res = subprocess.run(["sracmd.exe", "-StatusEra"], capture_output=True, text=True)
    print("[+] sracmd -StatusEra:")
    print(res.stdout)
except Exception as e:
    print(f"[-] sracmd StatusEra: {e}")

# Check xpal sleep/wake/power exports
import ctypes
xpal = ctypes.WinDLL("xpal.dll")
power_exports = [f for f in dir(xpal) if any(k in f.lower() for k in ["power", "sleep", "wake", "suspend", "resume", "standby", "state"])]
print(f"[+] xpal power/state exports: {power_exports}")
