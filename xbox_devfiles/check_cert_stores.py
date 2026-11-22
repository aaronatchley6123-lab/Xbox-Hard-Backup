import ctypes
from ctypes import wintypes

crypt32 = ctypes.windll.crypt32

CERT_SYSTEM_STORE_LOCAL_MACHINE = 0x00020000
CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000

for store_name in ["Root", "TrustedPeople", "AuthRoot", "CA", "MY"]:
    hStore = crypt32.CertOpenStore(
        10, # CERT_STORE_PROV_SYSTEM_W
        0,
        0,
        CERT_SYSTEM_STORE_LOCAL_MACHINE,
        ctypes.c_wchar_p(store_name)
    )
    if hStore:
        pCert = None
        count = 0
        found_custom = []
        while True:
            pCert = crypt32.CertEnumCertificatesInStore(hStore, pCert)
            if not pCert:
                break
            count += 1
            # Read cert name
            buf = ctypes.create_unicode_buffer(256)
            crypt32.CertGetNameStringW(pCert, 4, 0, None, buf, 256)
            name = buf.value
            if any(k in name.lower() for k in ["architect", "xbxowned", "devkit", "dev"]):
                found_custom.append(name)
        print(f"Store [LocalMachine\\{store_name}]: {count} certs, Custom: {found_custom}")
        crypt32.CertCloseStore(hStore, 0)
    else:
        print(f"Failed to open store LocalMachine\\{store_name}")

