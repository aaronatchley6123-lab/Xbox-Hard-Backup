
import ssl, os
from ctypes import wintypes, c_void_p, c_ulong, c_char_p, POINTER, byref, Structure, cast
import ctypes

crypt32 = ctypes.windll.crypt32

CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000
CERT_SYSTEM_STORE_LOCAL_MACHINE = 0x00020000
CERT_STORE_PROV_SYSTEM = 10
CERT_STORE_READONLY_FLAG = 0x00008000

class CERT_CONTEXT(Structure):
    pass
CERT_CONTEXT._fields_ = [
    ('dwCertEncodingType', wintypes.DWORD),
    ('pbCertEncoded', POINTER(ctypes.c_byte)),
    ('cbCertEncoded', wintypes.DWORD),
    ('pCertInfo', c_void_p),
    ('hCertStore', c_void_p)
]

CertOpenStore = crypt32.CertOpenStore
CertOpenStore.argtypes = [c_void_p, wintypes.DWORD, c_void_p, wintypes.DWORD, c_void_p]
CertOpenStore.restype = c_void_p

CertEnumCertificatesInStore = crypt32.CertEnumCertificatesInStore
CertEnumCertificatesInStore.argtypes = [c_void_p, POINTER(CERT_CONTEXT)]
CertEnumCertificatesInStore.restype = POINTER(CERT_CONTEXT)

CertGetNameStringA = crypt32.CertGetNameStringA
CertGetNameStringA.argtypes = [POINTER(CERT_CONTEXT), wintypes.DWORD, wintypes.DWORD, c_void_p, c_char_p, wintypes.DWORD]
CertGetNameStringA.restype = wintypes.DWORD

CertCloseStore = crypt32.CertCloseStore
CertCloseStore.argtypes = [c_void_p, wintypes.DWORD]
CertCloseStore.restype = wintypes.BOOL

stores = ["ROOT", "MY", "CA", "AuthRoot", "TrustedPublisher", "Disallowed"]
out_dir = r"D:\DevelopmentFiles\exported_certs"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

total = 0
for store_name in stores:
    for location_name, flag in [("LM", CERT_SYSTEM_STORE_LOCAL_MACHINE), ("CU", CERT_SYSTEM_STORE_CURRENT_USER)]:
        store_flag = flag | CERT_STORE_READONLY_FLAG
        name_w = ctypes.c_wchar_p(store_name)
        hStore = CertOpenStore(CERT_STORE_PROV_SYSTEM, 0, None, store_flag, name_w)
        if not hStore:
            continue
        pCtx = None
        idx = 0
        while True:
            pCtx = CertEnumCertificatesInStore(hStore, pCtx)
            if not pCtx:
                break
            idx += 1
            total += 1
            ctx = pCtx.contents
            buf = (ctypes.c_char * 256)()
            CertGetNameStringA(pCtx, 1, 0, None, buf, 256)
            subject = buf.value.decode('utf-8', errors='ignore').strip() or "Unnamed"
            # sanitize subject for filename
            clean_subject = "".join([c if c.isalnum() or c in " ._-" else "_" for c in subject])[:40]
            raw_bytes = bytes((ctypes.c_byte * ctx.cbCertEncoded).from_address(ctypes.addressof(ctx.pbCertEncoded.contents)))
            fname = f"{location_name}_{store_name}_{idx}_{clean_subject}.cer"
            fpath = os.path.join(out_dir, fname)
            with open(fpath, "wb") as f:
                f.write(raw_bytes)
            print(f"[+] Saved: {fname}")
        CertCloseStore(hStore, 0)
print(f"[*] Total certificates exported: {total}")
