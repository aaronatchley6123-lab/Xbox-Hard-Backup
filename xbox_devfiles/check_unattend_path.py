data = open(r"D:\DevelopmentFiles\toolsautoexec.exe", "rb").read()
import re
# find all wide strings and ascii strings with unattend
for s in re.findall(b"(?:[\x20-\x7e]\x00){4,}", data):
    dec = s.decode('utf-16le', errors='ignore')
    if 'unattend' in dec.lower() or '.cmd' in dec.lower() or '.bat' in dec.lower() or '.ps1' in dec.lower():
        print("Wide:", dec)
for s in re.findall(b"[\x20-\x7e]{4,}", data):
    dec = s.decode('ascii', errors='ignore')
    if 'unattend' in dec.lower() or '.cmd' in dec.lower() or '.bat' in dec.lower() or '.ps1' in dec.lower():
        print("Ascii:", dec)
