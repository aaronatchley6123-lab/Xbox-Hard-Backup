import subprocess
for d in ["C:\\.", "D:\\.", "M:\\.", "J:\\.", "Q:\\.", "S:\\.", "X:\\.", "Y:\\."]:
    print("=== ICACLS:", d)
    print(subprocess.getoutput(f'icacls "{d}"'))
