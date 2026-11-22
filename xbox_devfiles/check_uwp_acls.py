import subprocess
for d in ["C:\\", "D:\\", "M:\\", "J:\\", "J:\\tools", "Q:\\", "S:\\", "X:\\", "Y:\\"]:
    print("=== ICACLS:", d)
    print(subprocess.getoutput(f'icacls "{d}"'))
