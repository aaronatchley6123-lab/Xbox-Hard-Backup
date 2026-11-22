with open(r"X:\Apps\DevHome\microsoft.xbox.development.winmd", "rb") as f:
    d = f.read()

import re
matches = re.findall(rb'[A-Za-z0-9_]{3,}Cert[A-Za-z0-9_]*', d, re.IGNORECASE)
print("=== Matches in microsoft.xbox.development.winmd ===")
for m in set(matches):
    print(" ", m.decode(errors='ignore'))

