with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = re.findall(r"CertType\.[A-Za-z0-9_]+", text)
print("CertType references in framework.js:")
for m in set(matches):
    print(" ", m)

matches2 = re.findall(r"Cert\.[A-Za-z0-9_]+", text)
print("\nCert references in framework.js:")
for m in set(matches2):
    print(" ", m)

