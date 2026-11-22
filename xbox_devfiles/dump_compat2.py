js = open(r'D:\DevelopmentFiles\AllDrives\X_Drive\Apps\DevHome\toolwindows\compatMode\compatMode.js', 'r', encoding='utf-8', errors='ignore').read()
import re
for m in re.finditer(r'(_setCompatMode|_getCompatModeFriendlyName)\s*:\s*(async\s+)?function', js):
    start = m.start()
    print(f"=== {m.group(0)} ===")
    print(js[start:start+1000])
