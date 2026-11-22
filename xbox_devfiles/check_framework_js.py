with open(r"X:\Apps\DevHome\framework\js\framework.js", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if any(k in l for k in ['defaultWorkspace', 'loadWorkspace', 'toolwindows', 'activeWorkspace', 'registeredTools']):
        print(f"{i+1}: {l.strip()[:100]}")

