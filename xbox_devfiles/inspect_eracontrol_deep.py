with open("C:\\Windows\\System32\\eracontrol.exe", "rb") as f:
    data = f.read()

import re
# Find all ASCII and UTF-16 strings
strings_ascii = re.findall(rb"([A-Za-z0-9_\-\.\:\/\\]{4,})", data)
strings_utf16 = [m.decode("utf-16le", errors="ignore") for m in re.findall(rb"(?:[\x20-\x7e]\x00){4,}", data)]

print("Total ASCII strings:", len(strings_ascii))
print("Total UTF-16 strings:", len(strings_utf16))

print("\n--- Key ASCII strings in eracontrol.exe ---")
for s in strings_ascii:
    try:
        ss = s.decode('ascii')
        if any(k in ss.lower() for k in ['era', 'evict', 'release', 'title', 'partition', 'vm', 'hyper', 'switch', 'mode', 'service', 'start', 'stop', 'guest']):
            print("  ", ss)
    except:
        pass

print("\n--- Key UTF-16 strings in eracontrol.exe ---")
for ss in strings_utf16:
    if any(k in ss.lower() for k in ['era', 'evict', 'release', 'title', 'partition', 'vm', 'hyper', 'switch', 'mode', 'service', 'start', 'stop', 'guest']):
        print("  ", ss)
