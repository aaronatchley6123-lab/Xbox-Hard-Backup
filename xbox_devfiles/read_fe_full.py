with open(r"M:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy\AppxManifest.xml", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()
for l in lines[:25]:
    print(l, end='')
