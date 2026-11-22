with open(r"M:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\AppxManifest.xml", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

import re
m = re.findall(r'<Application\s+Id="([^"]+)"', text)
print("Application Id:", m)
m_pkg = re.findall(r'<Identity\s+Name="([^"]+)"', text)
print("Identity Name:", m_pkg)
