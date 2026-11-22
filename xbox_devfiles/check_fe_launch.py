import os, subprocess

for p in [
    r"C:\Windows\SystemApps\Microsoft.Windows.FileExplorer_cw5n1h2txyewy",
    r"C:\Windows\DefaultApp",
    r"D:\DevelopmentFiles\WindowsApps\XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap",
]:
    print("=== ICACLS:", p)
    print(subprocess.getoutput(f'icacls "{p}"'))
