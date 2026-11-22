import ctypes
from ctypes import wintypes

dll_path = r"C:\Windows\System32\crypttpmeksvc.dll"
dll = ctypes.WinDLL(dll_path)

print(f"[+] Loaded {dll_path}")

# 1. Test EKCliTpmGetManufacturerInfo
fn_mfg = getattr(dll, "EKCliTpmGetManufacturerInfo", None)
if fn_mfg:
    print("[+] Found EKCliTpmGetManufacturerInfo")
    # Let's inspect its signature and invoke
    # prototype: HRESULT (or DWORD) (DWORD* p1, DWORD* p2, ...)
    # Let's test with buffers
    buf1 = ctypes.create_string_buffer(512)
    buf2 = ctypes.create_string_buffer(512)
    p_dw1 = wintypes.DWORD(0)
    p_dw2 = wintypes.DWORD(0)
    try:
        res = fn_mfg(ctypes.byref(p_dw1), ctypes.byref(p_dw2), buf1, ctypes.byref(p_dw1))
        print(f"    fn_mfg returned: 0x{res & 0xFFFFFFFF:08X}, dw1={p_dw1.value}, dw2={p_dw2.value}")
    except Exception as e:
        print(f"    fn_mfg call exception: {e}")

# 2. Test EKCliAuthorityKeyGetInfo
fn_auth = getattr(dll, "EKCliAuthorityKeyGetInfo", None)
if fn_auth:
    print("[+] Found EKCliAuthorityKeyGetInfo")
    # Check calling with None or buffer
    try:
        res = fn_auth(None, None, None, 0)
        print(f"    fn_auth(0,0,0,0) returned: 0x{res & 0xFFFFFFFF:08X}")
    except Exception as e:
        print(f"    fn_auth call exception: {e}")

# 3. Test EKCliTpmEndorsementKeyGetInfo
fn_ek = getattr(dll, "EKCliTpmEndorsementKeyGetInfo", None)
if fn_ek:
    print("[+] Found EKCliTpmEndorsementKeyGetInfo")
    try:
        res = fn_ek(None, None, None, 0)
        print(f"    fn_ek(0,0,0,0) returned: 0x{res & 0xFFFFFFFF:08X}")
    except Exception as e:
        print(f"    fn_ek call exception: {e}")

