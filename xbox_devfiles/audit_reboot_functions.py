import ctypes
import os

print("====================================================")
print("[*] Auditing All Native Reboot Functions in xpal.dll & drivers")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

reboot_exports = [
    "XpalInitiateSystemShutdown",
    "XpalInitiatePowerStateToggle",
    "XpalIsRebootRequested",
    "XpalQueryPowerToggleSource",
    "XpalRefreshPowerChimeMode",
    "XpalSetWakeupTimer"
]

for exp in reboot_exports:
    if hasattr(xpal, exp):
        fn = getattr(xpal, exp)
        print(f"[+] xpal export available: {exp} at 0x{ctypes.cast(fn, ctypes.c_void_p).value:016X}")

# Check shutdown.exe flags in J:\tools
import subprocess
try:
    res = subprocess.run(["J:\\tools\\shutdown.exe", "/?"], capture_output=True, text=True)
    print("\n[+] J:\\tools\\shutdown.exe options:")
    print(res.stdout[:600])
except Exception as e:
    print("shutdown.exe error:", e)

# Check WDP reboot endpoint options
print("\n[*] Checking WDP API power state control endpoints:")
# /api/control/restart
# /api/control/shutdown

