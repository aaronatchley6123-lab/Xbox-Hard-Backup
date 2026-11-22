import winreg, hashlib

def get_service_sid(name):
    raw = name.upper().encode('utf-16le')
    digest = hashlib.sha1(raw).digest()
    sa = [int.from_bytes(digest[i*4:(i+1)*4], 'little') for i in range(5)]
    return f"S-1-5-80-{sa[0]}-{sa[1]}-{sa[2]}-{sa[3]}-{sa[4]}"

target = "S-1-5-80-2940520708-3855866260-481812779-327648279-1710889582"

h = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services")
i = 0
found = None
while True:
    try:
        sname = winreg.EnumKey(h, i)
        i += 1
        sid = get_service_sid(sname)
        if sid == target:
            found = sname
            print(f"[!] MATCH FOUND: Service '{sname}' has SID {sid}")
            break
    except OSError:
        break
if not found:
    print(f"[-] No match found among {i} services")
