with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'_certType', text)]
for m in matches[:10]:
    print(text[m-80:m+120])
    print("---")

