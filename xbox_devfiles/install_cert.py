import ctypes
import os
import base64

def install_cert(cert_path, store_name):
    print(f"[*] Installing {cert_path} into {store_name} store...", flush=True)
    crypt32 = ctypes.windll.crypt32
    
    crypt32.CertOpenStore.restype = ctypes.c_void_p
    crypt32.CertOpenStore.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_wchar_p]
    
    crypt32.CertAddEncodedCertificateToStore.restype = ctypes.c_bool
    crypt32.CertAddEncodedCertificateToStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_char_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p]
    
    crypt32.CertCloseStore.restype = ctypes.c_bool
    crypt32.CertCloseStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32]

    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    # If PEM format, decode base64
    if b"-----BEGIN" in cert_data:
        text = cert_data.decode('latin1')
        b64 = "".join([l.strip() for l in text.splitlines() if not l.startswith("-----")])
        der_data = base64.b64decode(b64)
    else:
        der_data = cert_data

    # CERT_STORE_PROV_SYSTEM_W = 10
    # CERT_SYSTEM_STORE_CURRENT_USER = 0x00010000
    flags = 0x00010000 | 0x00004000
    hStore = crypt32.CertOpenStore(10, 0, None, flags, store_name)
    if not hStore:
        print(f"[-] Failed to open store {store_name}, err={ctypes.GetLastError()}", flush=True)
        return False

    res = crypt32.CertAddEncodedCertificateToStore(
        hStore,
        1, # X509_ASN_ENCODING
        der_data,
        len(der_data),
        3, # CERT_STORE_ADD_REPLACE_EXISTING
        None
    )
    err = ctypes.GetLastError()
    crypt32.CertCloseStore(hStore, 0)
    
    if res:
        print(f"[+] Successfully installed certificate into {store_name}!", flush=True)
        return True
    else:
        print(f"[-] CertAddEncodedCertificateToStore failed, err={err:#x}", flush=True)
        return False

if __name__ == '__main__':
    cert = r"D:\DevelopmentFiles\<REDACTED_CERT>"
    install_cert(cert, "Root")
    install_cert(cert, "TrustedPeople")
