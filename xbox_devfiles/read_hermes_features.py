with open(r"D:\DevelopmentFiles\LooseApps\Hermes_Xbox_Native\hermes_uwp_main.cpp", "r", errors="ignore") as f:
    text = f.read()

import re
matches = re.findall(r'Render[A-Za-z0-9_]+\(', text)
print("HermesOS Render functions:", set(matches))
titles = re.findall(r'DrawText[A-Za-z0-9_]*\([^,]+,[^,]+,[^,]+,\s*"([^"]+)"', text)
print("HermesOS UI Titles:", set(titles[:25]))
