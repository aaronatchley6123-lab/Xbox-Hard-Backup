import winreg

try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\MountedDevices") as k:
        n_sub, n_val, _ = winreg.QueryInfoKey(k)
        for i in range(n_val):
            vn, vv, vt = winreg.EnumValue(k, i)
            if 'K:' in vn or 'Xvs' in str(vv) or 'Aremas' in str(vv):
                print(f"  {vn} = {vv}")
except Exception as e:
    print("Err MountedDevices:", e)

# Also check GfxTelemetryClient.exe strings around aremas
with open(r"C:\Windows\System32\GfxTelemetryClient.exe", "rb") as f:
    d = f.read()

import re
matches = re.findall(rb'[A-Za-z0-9_\\/.:]{4,}aremas[A-Za-z0-9_\\/.:]*', d, re.IGNORECASE)
print("\n=== Matches in GfxTelemetryClient.exe ===")
for m in set(matches):
    print(" ", m.decode(errors='ignore'))

