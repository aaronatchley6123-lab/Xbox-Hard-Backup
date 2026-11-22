import ctypes
import struct

print("====================================================")
print("[*] Probing XpalGetConsoleCertificate & Capability Bitmasks...")
print("====================================================")

xpal = ctypes.WinDLL("xpal.dll")

# 1. Inspect Console Certificate pointer
if hasattr(xpal, "XpalGetConsoleCertificate"):
    fn_cert = xpal.XpalGetConsoleCertificate
    fn_cert.restype = ctypes.c_void_p
    pCert = fn_cert()
    print(f"[+] XpalGetConsoleCertificate() pointer: {pCert:#x}")
    if pCert:
        # Read first 128 bytes of certificate structure
        raw_cert = bytes((ctypes.c_ubyte * 128).from_address(pCert))
        print(f"[+] Cert Header Hex: {raw_cert[:32].hex()}")
        # Check capability dwords
        for i in range(0, min(len(raw_cert), 64), 4):
            val = struct.unpack("<I", raw_cert[i:i+4])[0]
            if val != 0:
                print(f"    Offset +{i:02d} (0x{i:02X}): {val:#010x} ({val})")

# 2. Test XIsCapabilityEnabled / XpalIsCapabilityEnabled for bits 0 to 63
print("\n[*] Testing Capability Bitmask query across all 64 bits:")
if hasattr(xpal, "XpalIsCapabilityEnabled"):
    fn_cap = xpal.XpalIsCapabilityEnabled
    fn_cap.restype = ctypes.c_bool
    fn_cap.argtypes = [ctypes.c_uint32]
    
    active_bits = []
    for bit in range(64):
        try:
            if fn_cap(bit):
                active_bits.append(bit)
        except Exception:
            pass
    print(f"[+] Active capability bits: {active_bits}")

