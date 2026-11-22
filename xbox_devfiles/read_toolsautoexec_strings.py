data = open(r"D:\DevelopmentFiles\toolsautoexec.exe", "rb").read()
import re
strings = re.findall(b"[\x20-\x7e]{4,}", data)
for s in strings:
    s_dec = s.decode('ascii', errors='ignore')
    if any(k in s_dec.lower() for k in ['cmd', 'bat', 'autoexec', 'run', 'boot', 'exec', 'reg', 'launch', 'script']):
        print(" ", s_dec)
