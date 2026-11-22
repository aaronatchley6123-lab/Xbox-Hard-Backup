with open("X:\\Apps\\DevHome\\framework\\js\\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
for m in re.finditer(r"(loadSettings|saveSettings|_loadSettings|_saveSettings)", text):
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 300)
    print("Match at", m.start(), ":")
    print(text[start:end])
    print("="*40)
