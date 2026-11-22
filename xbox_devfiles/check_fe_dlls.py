import os, re

fe_path = r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\FileExplorer.exe"
data = open(fe_path, "rb").read()
dlls = set(m.group(0).decode("ascii", "ignore") for m in re.finditer(b"[A-Za-z0-9_.-]+\\.dll", data, re.IGNORECASE))
for d in sorted(dlls):
    s32 = os.path.exists(os.path.join(r"C:\Windows\System32", d))
    w11 = os.path.exists(os.path.join(r"D:\Win11\System32", d))
    if not s32 and not d.lower().startswith("api-ms-") and not d.lower().startswith("ext-ms-"):
        print(f"MISSING in C:\\Windows\\System32: {d:30s} | in D:\\Win11\\System32: {w11}")
