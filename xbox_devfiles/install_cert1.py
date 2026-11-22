import ctypes
cert=r"D:\DevelopmentFiles\<REDACTED_CERT>"
c=ctypes.windll.crypt32
c.CertOpenStore.restype=ctypes.c_void_p
c.CertOpenStore.argtypes=[ctypes.c_uint32,ctypes.c_uint32,ctypes.c_void_p,ctypes.c_uint32,ctypes.c_wchar_p]
c.CertAddEncodedCertificateToStore.restype=ctypes.c_bool
c.CertAddEncodedCertificateToStore.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_char_p,ctypes.c_uint32,ctypes.c_uint32,ctypes.c_void_p]
c.CertCloseStore.argtypes=[ctypes.c_void_p,ctypes.c_uint32]
data=open(cert,"rb").read()
for store,flag in [("Root",0x00020000),("TrustedPeople",0x00020000),("TrustedPublisher",0x00020000),("MY",0x00010000)]:
 h=c.CertOpenStore(10,0,None,flag,store)
 if h:
  der=data if data[:1]!=b"-" else data
  ok=c.CertAddEncodedCertificateToStore(h,1,der,len(der),3,None)
  print(store,"installed" if ok else "failed")
  c.CertCloseStore(h,0)
 else:
  print(store,"store_unavailable")
