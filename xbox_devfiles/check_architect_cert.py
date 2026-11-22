import ctypes
import hashlib

c = ctypes.windll.crypt32
c.CertGetNameStringA.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
c.CertGetNameStringA.restype = ctypes.c_uint32

stores = ["ROOT", "TrustedPublisher", "MY", "CA", "AuthRoot"]
CERT_STORE_PROV_SYSTEM_A = 9
CERT_SYSTEM_STORE_LOCAL_MACHINE = 0x00020000
CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000

for flags, flag_name in [(CERT_SYSTEM_STORE_LOCAL_MACHINE, "LocalMachine"), (CERT_SYSTEM_STORE_CURRENT_USER, "CurrentUser")]:
    for s in stores:
        h = c.CertOpenStore(CERT_STORE_PROV_SYSTEM_A, 0, None, flags, s.encode())
        if not h:
            continue
        p = None
        while True:
            p = c.CertEnumCertificatesInStore(h, p)
            if not p:
                break
            buf = ctypes.create_string_buffer(512)
            c.CertGetNameStringA(p, 4, 0, None, buf, 512)
            name = buf.value.decode("utf-8", errors="ignore")
            if "architect" in name.lower():
                print(f"[FOUND] '{name}' in {flag_name}\\{s}")
        c.CertCloseStore(h, 0)
