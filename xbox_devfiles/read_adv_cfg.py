with open("X:\\Apps\\DevHome\\framework\\js\\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
m = re.search(r"_getDefaultAdvancedDevkitConfigurationAsync", text)
if m:
    start = max(0, m.start() - 200)
    end = min(len(text), m.end() + 1500)
    print(text[start:end])
else:
    print("Not found")
