import os, subprocess

p = r"S:\Program Files\WindowsApps\Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe"
print(subprocess.getoutput(f'icacls "{p}"'))
print(subprocess.getoutput(f'icacls "{p}\\framework\\js\\framework.js"'))
print(subprocess.getoutput('fsutil fsinfo volumeinfo S:\\'))
print(subprocess.getoutput('fsutil fsinfo volumeinfo X:\\'))
