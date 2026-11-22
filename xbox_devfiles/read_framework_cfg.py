import re

with open("X:\\Apps\\DevHome\\framework\\js\\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Find _defaultEraConfiguration and _defaultUwaConfiguration
for name in ["_defaultEraConfiguration", "_defaultUwaConfiguration", "toolwindows", "getWorkspace"]:
    matches = [m.start() for m in re.finditer(re.escape(name), text)]
    print(f"Occurrences of {name}: {len(matches)}")
    for m in matches[:3]:
        start = max(0, m - 100)
        end = min(len(text), m + 300)
        print(f"--- Context for {name} at {m} ---")
        print(text[start:end])
        print("-------------------------------")
