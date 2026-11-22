data = open(r"C:\Windows\System32\toolsautoexec.exe", "rb").read()
import re
paths = re.findall(b"[A-Za-z]:\\\\[A-Za-z0-9_\\\\]+", data)
print("Paths in toolsautoexec.exe:")
for p in set(paths):
    print(" ", p.decode('ascii', errors='ignore'))
