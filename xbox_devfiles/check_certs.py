import ctypes
import sys

print("Checking Windows Certificate stores on Xbox...", flush=True)
try:
    c = ctypes.windll.crypt32
    c.CertOpenSystemStoreA.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    c.CertOpenSystemStoreA.restype = ctypes.c_void_p
    c.CertEnumCertificatesInStore.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    c.CertEnumCertificatesInStore.restype = ctypes.c_void_p
    c.CertGetNameStringA.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
    c.CertGetNameStringA.restype = ctypes.c_uint32

    stores = [b"ROOT", b"MY", b"TrustedPublisher", b"AuthRoot", b"CA"]
    for s_name in stores:
        h = c.CertOpenSystemStoreA(None, s_name)
        if not h:
            continue
        p = None
        count = 0
        matches = []
        all_certs = []
        while True:
            p = c.CertEnumCertificatesInStore(h, p)
            if not p:
                break
            count += 1
            buf = ctypes.create_string_buffer(512)
            c.CertGetNameStringA(p, 4, 0, None, buf, 512)
            name = buf.value.decode("utf-8", errors="ignore")
            all_certs.append(name)
            if any(k.lower() in name.lower() for k in ["6001", "architect", "thearchitect", "xbox", "test"]):
                matches.append(name)
        print(f"\n[Store: {s_name.decode()}] Total: {count}")
        if matches:
            print(f"  Matches: {matches}")
        else:
            print(f"  Sample: {all_certs[:3]}")
except Exception as e:
    print("Error:", e, flush=True)
