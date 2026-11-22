with open(r"C:\Windows\WebManagement\www\default\tools\XboxUnattendedSetup\XboxUnattendedSetup.js", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function deployScript(" in line or "function runScriptHelper(" in line:
        print(f"--- Line {i+1} ---")
        print("".join(lines[i:i+40]))
