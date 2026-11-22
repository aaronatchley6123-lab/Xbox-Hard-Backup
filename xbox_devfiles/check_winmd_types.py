with open(r"X:\Apps\DevHome\microsoft.xbox.development.winmd", "rb") as f:
    d = f.read()

import re
matches = re.findall(rb'[A-Za-z0-9_]{4,}', d)
types = [m.decode(errors='ignore') for m in matches if any(k in m.lower() for k in [b'cert', b'devkit', b'era', b'uwp', b'mode', b'license'])]
print(f"Total matching tokens: {len(types)}")
for t in sorted(set(types)):
    print(" ", t)

