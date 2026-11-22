with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
pos = text.find("uwaDevkit")
if pos != -1:
    print(text[pos-200:pos+300])

