import os, subprocess

print(subprocess.getoutput('dir /a "D:\\DevelopmentFiles\\WindowsApps"'))
print(subprocess.getoutput('dir /a "S:\\Program Files\\WindowsApps" | findstr /i "DevHome XBXOwned"'))
