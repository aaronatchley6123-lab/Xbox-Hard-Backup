import os

print("Searching for xrounlock across drives...")
for d in ['J:\\', 'C:\\Windows\\System32', 'M:\\windows\\system32', 'D:\\']:
    if not os.path.exists(d):
        continue
    for root, dirs, files in os.walk(d):
        for f in files:
            if 'xro' in f.lower():
                print("Found XRO file:", os.path.join(root, f))
        if len(root.split('\\')) > 3:
            dirs.clear()

print("\n--- Inspecting strings in J:\\tools\\xrolock.exe ---")
with open("J:\\tools\\xrolock.exe", "rb") as fp:
    data = fp.read()

import re
matches = re.findall(rb"([A-Za-z0-9_\-\/\\]{4,})", data)
for m in matches:
    try:
        s = m.decode('ascii')
        if any(k in s.lower() for k in ['lock', 'unlock', 'xro', 'filter', 'driver', 'path', 'dir']):
            print("  xrolock string:", s)
    except:
        pass

print("\n--- Inspecting exports / strings in J:\\tools\\xrofilter.dll ---")
with open("J:\\tools\\xrofilter.dll", "rb") as fp:
    data2 = fp.read()

matches2 = re.findall(rb"([A-Za-z0-9_\-\/\\]{4,})", data2)
for m in matches2:
    try:
        s = m.decode('ascii')
        if any(k in s.lower() for k in ['lock', 'unlock', 'xro', 'filter', 'driver', 'path', 'dir']):
            print("  xrofilter string:", s)
    except:
        pass
