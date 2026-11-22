import ctypes
from ctypes import wintypes

dll = ctypes.WinDLL(r"C:\Windows\System32\crypttpmeksvc.dll")
fn_ek = getattr(dll, "EKCliTpmEndorsementKeyGetInfo")

# Signature:
# DWORD EKCliTpmEndorsementKeyGetInfo(
#     LPCWSTR pwszProvider,
#     LPCWSTR pwszKeyName,
#     LPCWSTR pwszHashAlg,
#     DWORD dwFlags,
#     DWORD* pcbCert,
#     BYTE** ppbCert,
#     DWORD* pcbPubKey,
#     BYTE** ppbPubKey
# )

fn_ek.argtypes = [
    wintypes.LPCWSTR,
    wintypes.LPCWSTR,
    wintypes.LPCWSTR,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(ctypes.c_void_p),
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(ctypes.c_void_p)
]
fn_ek.restype = wintypes.DWORD

cbCert = wintypes.DWORD(0)
pbCert = ctypes.c_void_p(0)
cbPub = wintypes.DWORD(0)
pbPub = ctypes.c_void_p(0)

provider = "Microsoft Platform Crypto Provider"

for key_name in [None, "Identity", "Storage", "EndorsementKey", "PCP_EK"]:
    cbCert.value = 0
    pbCert.value = 0
    cbPub.value = 0
    pbPub.value = 0
    res = fn_ek(
        provider,
        key_name,
        None,
        0,
        ctypes.byref(cbCert),
        ctypes.byref(pbCert),
        ctypes.byref(cbPub),
        ctypes.byref(pbPub)
    )
    print(f"Key={key_name}: res=0x{res:08X}, cbCert={cbCert.value}, cbPub={cbPub.value}")

