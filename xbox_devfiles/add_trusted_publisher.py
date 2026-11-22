import ctypes

c = ctypes.windll.crypt32
c.CertOpenStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p]
c.CertOpenStore.restype = ctypes.c_void_p
c.CertEnumCertificatesInStore.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
c.CertEnumCertificatesInStore.restype = ctypes.c_void_p
c.CertAddCertificateContextToStore.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p]
c.CertAddCertificateContextToStore.restype = ctypes.c_bool
c.CertGetNameStringA.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
c.CertGetNameStringA.restype = ctypes.c_uint32

CERT_STORE_PROV_SYSTEM_A = 9
CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000
CERT_STORE_ADD_REPLACE_EXISTING = 3

hRoot = c.CertOpenStore(CERT_STORE_PROV_SYSTEM_A, 0, None, CERT_SYSTEM_STORE_CURRENT_USER, b"ROOT")
hPub = c.CertOpenStore(CERT_STORE_PROV_SYSTEM_A, 0, None, CERT_SYSTEM_STORE_CURRENT_USER, b"TrustedPublisher")

p = None
added = False
while True:
    p = c.CertEnumCertificatesInStore(hRoot, p)
    if not p: break
    buf = ctypes.create_string_buffer(512)
    c.CertGetNameStringA(p, 4, 0, None, buf, 512)
    name = buf.value.decode("utf-8", errors="ignore")
    if name == "tester":
        res = c.CertAddCertificateContextToStore(hPub, p, CERT_STORE_ADD_REPLACE_EXISTING, None)
        print("CertAddCertificateContextToStore to TrustedPublisher result:", res, flush=True)
        added = True
        break

if not added:
    print("TheArchitect not found in ROOT store to copy.", flush=True)
