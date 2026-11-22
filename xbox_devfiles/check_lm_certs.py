import ctypes
import hashlib

c = ctypes.windll.crypt32
c.CertOpenStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p]
c.CertOpenStore.restype = ctypes.c_void_p
c.CertEnumCertificatesInStore.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
c.CertEnumCertificatesInStore.restype = ctypes.c_void_p
c.CertGetNameStringA.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
c.CertGetNameStringA.restype = ctypes.c_uint32

CERT_STORE_PROV_SYSTEM_A = 9
CERT_SYSTEM_STORE_LOCAL_MACHINE = 0x00020000
CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000

for flag, loc in [(CERT_SYSTEM_STORE_LOCAL_MACHINE, "LocalMachine"), (CERT_SYSTEM_STORE_CURRENT_USER, "CurrentUser")]:
    for s_name in [b"ROOT", b"TrustedPublisher", b"MY", b"AuthRoot", b"CA", b"Disallowed"]:
        h = c.CertOpenStore(CERT_STORE_PROV_SYSTEM_A, 0, None, flag, s_name)
        if not h: continue
        p = None
        items = []
        while True:
            p = c.CertEnumCertificatesInStore(h, p)
            if not p: break
            buf = ctypes.create_string_buffer(512)
            c.CertGetNameStringA(p, 4, 0, None, buf, 512)
            name = buf.value.decode("utf-8", errors="ignore")
            
            class CERT_CONTEXT(ctypes.Structure):
                _fields_ = [
                    ("dwCertEncodingType", ctypes.c_uint32),
                    ("pbCertEncoded", ctypes.c_void_p),
                    ("cbCertEncoded", ctypes.c_uint32),
                ]
            ctx = CERT_CONTEXT.from_address(p)
            raw = ctypes.string_at(ctx.pbCertEncoded, ctx.cbCertEncoded)
            thumb = hashlib.sha1(raw).hexdigest().upper()
            items.append((name, thumb))
        if items:
            print(f"[{loc}\\{s_name.decode()}] ({len(items)} certs):")
            for name, thumb in items:
                if any(x in thumb for x in ["6001", "6000"]) or any(x in name for x in ["6001", "Architect"]):
                    print(f"  * MATCH: {name} | {thumb}")
                else:
                    print(f"    {name} | {thumb}")
