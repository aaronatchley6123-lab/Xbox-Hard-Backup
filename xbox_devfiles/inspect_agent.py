with open("J:\\tools\\agent-xbox.exe", "rb") as f:
    data = f.read()

import re
m = re.findall(rb"([A-Za-z0-9_\-\.]{5,})", data)
print("Strings count:", len(m))
for s in m[:50]:
    try:
        ss = s.decode('ascii')
        if any(k in ss.lower() for k in ['agent', 'xbox', 'version', 'build', 'dev', 'microsoft']):
            print("  ", ss)
    except:
        pass
