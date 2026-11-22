import sys

js = open(r'D:\DevelopmentFiles\AllDrives\X_Drive\Apps\DevHome\toolwindows\compatMode\compatMode.js', 'r', encoding='utf-8', errors='ignore').read()
idx1 = js.find('_setCompatMode')
print("=== _setCompatMode ===")
print(js[idx1:idx1+1200])

idx2 = js.find('_getCompatModeFriendlyName')
print("\n=== _getCompatModeFriendlyName ===")
print(js[idx2:idx2+1200])
