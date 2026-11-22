import ctypes
import hashlib

c = ctypes.windll.crypt32
c.CertOpenSystemStoreA.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
c.CertOpenSystemStoreA.restype = ctypes.c_void_p
c.CertEnumCertificatesInStore.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
c.CertEnumCertificatesInStore.restype = ctypes.c_void_p
c.CertGetNameStringA.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
c.CertGetNameStringA.restype = ctypes.c_uint32

h = c.CertOpenSystemStoreA(None, b"ROOT")
p = None
idx = 1
while True:
    p = c.CertEnumCertificatesInStore(h, p)
    if not p: break
    buf = ctypes.create_string_buffer(512)
    c.CertGetNameStringA(p, 4, 0, None, buf, 512)
    subj = buf.value.decode("utf-8", errors="ignore")
    
    class CERT_CONTEXT(ctypes.Structure):
        _fields_ = [
            ("dwCertEncodingType", ctypes.c_uint32),
            ("pbCertEncoded", ctypes.c_void_p),
            ("cbCertEncoded", ctypes.c_uint32),
        ]
    ctx = CERT_CONTEXT.from_address(p)
    raw = ctypes.string_at(ctx.pbCertEncoded, ctx.cbCertEncoded)
    thumb = hashlib.sha1(raw).hexdigest().upper()
    print(f"[{idx}] {subj} | SHA1: {thumb}", flush=True)
    idx += 1
