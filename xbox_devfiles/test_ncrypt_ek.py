import ctypes
from ctypes import wintypes

ncrypt = ctypes.WinDLL("ncrypt.dll")
crypttpm = ctypes.WinDLL("crypttpmeksvc.dll")

# NCryptOpenStorageProvider
fn_open_prov = ncrypt.NCryptOpenStorageProvider
fn_open_prov.argtypes = [ctypes.POINTER(ctypes.c_void_p), wintypes.LPCWSTR, wintypes.DWORD]
fn_open_prov.restype = wintypes.DWORD

# NCryptOpenKey
fn_open_key = ncrypt.NCryptOpenKey
fn_open_key.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p), wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
fn_open_key.restype = wintypes.DWORD

# NCryptFreeObject
fn_free = ncrypt.NCryptFreeObject
fn_free.argtypes = [ctypes.c_void_p]
fn_free.restype = wintypes.DWORD

# EKCliAuthorityKeyGetInfo
fn_auth_info = getattr(crypttpm, "EKCliAuthorityKeyGetInfo")

hProv = ctypes.c_void_p(0)
status = fn_open_prov(ctypes.byref(hProv), "Microsoft Platform Crypto Provider", 0)
print(f"[+] NCryptOpenStorageProvider(MS_PLATFORM_CRYPTO_PROVIDER): 0x{status:08X}, hProv=0x{hProv.value or 0:X}")

if status == 0:
    # Try opening TPM keys
    for k in ["Identity", "Storage", "EndorsementKey", "PCP_EK"]:
        hKey = ctypes.c_void_p(0)
        st_key = fn_open_key(hProv, ctypes.byref(hKey), k, 0, 0)
        print(f"    NCryptOpenKey('{k}'): 0x{st_key:08X}, hKey=0x{hKey.value or 0:X}")
        if st_key == 0:
            # Call EKCliAuthorityKeyGetInfo
            cbCert = wintypes.DWORD(0)
            pbCert = ctypes.c_void_p(0)
            cbPub = wintypes.DWORD(0)
            pbPub = ctypes.c_void_p(0)
            res = fn_auth_info(hKey, None, None, 0, ctypes.byref(cbCert), ctypes.byref(pbCert), ctypes.byref(cbPub), ctypes.byref(pbPub))
            print(f"    EKCliAuthorityKeyGetInfo result: 0x{res:08X}")
            fn_free(hKey)
    fn_free(hProv)

# Also test Software KSP fallback
hProvSoft = ctypes.c_void_p(0)
status_soft = fn_open_prov(ctypes.byref(hProvSoft), "Microsoft Software Key Storage Provider", 0)
print(f"[+] NCryptOpenStorageProvider(MS_SOFTWARE_KEY_STORAGE_PROVIDER): 0x{status_soft:08X}, hProv=0x{hProvSoft.value or 0:X}")
if status_soft == 0:
    # Create an ephemeral RSA key to test EKCliAuthorityKeyGetInfo on a live handle
    fn_create = ncrypt.NCryptCreatePersistedKey
    fn_create.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p), wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
    fn_create.restype = wintypes.DWORD
    
    fn_finalize = ncrypt.NCryptFinalizeKey
    fn_finalize.argtypes = [ctypes.c_void_p, wintypes.DWORD]
    fn_finalize.restype = wintypes.DWORD
    
    hKeySoft = ctypes.c_void_p(0)
    st_c = fn_create(hProvSoft, ctypes.byref(hKeySoft), "RSA", None, 0, 0)
    print(f"    NCryptCreatePersistedKey(RSA): 0x{st_c:08X}")
    if st_c == 0:
        st_f = fn_finalize(hKeySoft, 0)
        print(f"    NCryptFinalizeKey: 0x{st_f:08X}")
        cbCert = wintypes.DWORD(0)
        pbCert = ctypes.c_void_p(0)
        cbPub = wintypes.DWORD(0)
        pbPub = ctypes.c_void_p(0)
        res = fn_auth_info(hKeySoft, None, None, 0, ctypes.byref(cbCert), ctypes.byref(pbCert), ctypes.byref(cbPub), ctypes.byref(pbPub))
        print(f"    EKCliAuthorityKeyGetInfo(hKeySoft): 0x{res:08X}")
        fn_free(hKeySoft)
    fn_free(hProvSoft)
