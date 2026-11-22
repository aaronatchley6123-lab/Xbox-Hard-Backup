import ctypes, base64

crypt32 = ctypes.windll.crypt32
crypt32.CertOpenStore.restype = ctypes.c_void_p
crypt32.CertOpenStore.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_wchar_p]
crypt32.CertAddEncodedCertificateToStore.restype = ctypes.c_bool
crypt32.CertAddEncodedCertificateToStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_char_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p]
crypt32.CertCloseStore.restype = ctypes.c_bool
crypt32.CertCloseStore.argtypes = [ctypes.c_void_p, ctypes.c_uint32]

with open(r"D:\DevelopmentFiles\<REDACTED_CERT>", "rb") as f:
    cert_data = f.read()
if b"-----BEGIN" in cert_data:
    text = cert_data.decode("latin1")
    b64 = "".join([l.strip() for l in text.splitlines() if not l.startswith("-----")])
    der_data = base64.b64decode(b64)
else:
    der_data = cert_data

for loc_name, loc_flag in [("CurrentUser", 0x00010000), ("LocalMachine", 0x00020000)]:
    for store in ["Root", "TrustedPublisher", "TrustedPeople", "MY", "CA", "AuthRoot"]:
        hStore = crypt32.CertOpenStore(10, 0, None, loc_flag, store)
        if not hStore:
            print(f"[-] Open {loc_name}\\{store} failed: err={ctypes.GetLastError()}")
            continue
        res = crypt32.CertAddEncodedCertificateToStore(hStore, 1, der_data, len(der_data), 3, None)
        err = ctypes.GetLastError()
        crypt32.CertCloseStore(hStore, 0)
        print(f"[*] {loc_name}\\{store} -> res={res} (err={err})")
