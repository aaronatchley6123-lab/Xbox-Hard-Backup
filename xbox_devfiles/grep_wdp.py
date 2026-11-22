import re

with open(r"C:\Windows\WebManagement\www\default\tools\XboxUnattendedSetup\XboxUnattendedSetup.js", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

urls = set(re.findall(r'url:\s*["\']([^"\']+)["\']', content))
print("Found URLs in XboxUnattendedSetup.js:")
for u in sorted(urls):
    print("  -", u)

# Also find functions that deploy or run
funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', content)
print("\nKey functions:")
for fn in funcs:
    if any(k in fn.lower() for k in ["deploy", "run", "apply", "execute", "script"]):
        print("  -", fn)
