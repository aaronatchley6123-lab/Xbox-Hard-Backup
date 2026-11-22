import os
p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe"
for root, dirs, files in os.walk(p):
    for f in files:
        if f.endswith(".js"):
            fp = os.path.join(root, f)
            txt = open(fp, "r", encoding="utf-8", errors="ignore").read()
            for i, line in enumerate(txt.splitlines(), 1):
                if any(k in line for k in ["_certType", "_fullCertType", "_consoleType", "Cert.", "ConsoleType.", "uwaDevkit"]):
                    print(f"{os.path.relpath(fp, p)}:{i}: {line.strip()}")
