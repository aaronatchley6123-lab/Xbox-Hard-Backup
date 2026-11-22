import re

for dll in [r"C:\Windows\System32\crypttpmeksvc.dll", r"C:\Windows\System32\CertEnroll.dll"]:
    with open(dll, "rb") as f:
        d = f.read()
    print(f"=== {dll} ===")
    matches = re.findall(rb'[A-Za-z0-9_]{4,}', d)
    ek_matches = set()
    for m in matches:
        m_lower = m.lower()
        if b'ekcli' in m_lower or b'authority' in m_lower or b'getkey' in m_lower:
            ek_matches.add(m.decode(errors='ignore'))
    for s in sorted(ek_matches):
        print(" ", s)
