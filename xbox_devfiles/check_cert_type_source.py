with open(r"X:\Apps\DevHome\Microsoft.Xbox.Tools.DevHome.dll", "rb") as f:
    d = f.read()

import re
matches = re.findall(rb'[A-Za-z0-9_]{3,}CertType[A-Za-z0-9_]*', d, re.IGNORECASE)
print("=== Matches in DevHome.dll ===")
for m in set(matches):
    print(" ", m.decode(errors='ignore'))

# Also check xpal.dll
with open(r"C:\Windows\System32\xpal.dll", "rb") as f:
    d2 = f.read()

matches2 = re.findall(rb'[A-Za-z0-9_]{3,}Cert[A-Za-z0-9_]*', d2, re.IGNORECASE)
print("\n=== Matches in xpal.dll ===")
for m in set(matches2):
    print(" ", m.decode(errors='ignore'))

