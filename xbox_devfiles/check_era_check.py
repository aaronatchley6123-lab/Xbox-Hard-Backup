with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'_defaultEraConfiguration', text)]
for m in matches:
    print(text[m-100:m+200])
    print("---")

