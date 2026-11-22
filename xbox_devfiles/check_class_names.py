with open(r"X:\Apps\DevHome\microsoft.xbox.development.winmd", "rb") as f:
    d = f.read()

import re
matches = re.findall(rb'Microsoft\.Xbox\.Development\.[A-Za-z0-9_]+', d)
print("Classes in Microsoft.Xbox.Development:")
for c in sorted(set(matches)):
    print(" ", c.decode(errors='ignore'))

