import ctypes
import sys

def main():
    print("=" * 60)
    print("   NATIVE XPAL HYPERVISOR & HARDWARE SOFTWARE INTERROGATOR   ")
    print("=" * 60)

    try:
        xpal = ctypes.WinDLL("xpal.dll")
    except Exception as e:
        print(f"[-] Failed to load xpal.dll: {e}")
        return

    # Basic booleans and integers
    simple_queries = [
        ("XpalIsInternalDevkit", ctypes.c_bool, []),
        ("XpalIsExternalDevkit", ctypes.c_bool, []),
        ("XpalIsGen8", ctypes.c_bool, []),
        ("XpalIsGen9", ctypes.c_bool, []),
        ("XpalIsHyperV", ctypes.c_bool, []),
        ("XpalIsSilentBootMode", ctypes.c_bool, []),
        ("XpalGetConsoleMode", ctypes.c_uint32, []),
        ("XpalGetGenerationType", ctypes.c_uint32, []),
        ("XpalGetServerType", ctypes.c_uint32, []),
        ("XpalGetSystemType", ctypes.c_uint32, []),
        ("XpalGetVmType", ctypes.c_uint32, []),
        ("XpalGetSouthBridgeType", ctypes.c_uint32, []),
        ("XpalGetCapabilities", ctypes.c_uint64, []),
    ]

    for name, restype, argtypes in simple_queries:
        if hasattr(xpal, name):
            try:
                fn = getattr(xpal, name)
                fn.restype = restype
                fn.argtypes = argtypes
                val = fn()
                if restype == ctypes.c_bool:
                    print(f"[*] {name:<28}: {bool(val)}")
                elif restype == ctypes.c_uint64 or restype == ctypes.c_uint32:
                    print(f"[*] {name:<28}: {hex(val)} ({val})")
            except Exception as e:
                print(f"[-] {name:<28}: error {e}")

    # Smc Firmware ID
    if hasattr(xpal, "XpalGetSmcFirmwareId"):
        try:
            fn = xpal.XpalGetSmcFirmwareId
            fn.restype = ctypes.c_uint32
            smc_id = ctypes.c_uint32(0)
            res = fn(ctypes.byref(smc_id))
            print(f"[*] XpalGetSmcFirmwareId        : res={res:#x}, SMC_ID={smc_id.value:#x} ({smc_id.value})")
        except Exception as e:
            print(f"[-] XpalGetSmcFirmwareId        : error {e}")

    # Console Certificate
    if hasattr(xpal, "XpalGetConsoleCertificate"):
        try:
            fn = xpal.XpalGetConsoleCertificate
            buf = (ctypes.c_ubyte * 1024)()
            buf_len = ctypes.c_uint32(1024)
            res = fn(buf, ctypes.byref(buf_len))
            cert_bytes = bytes(buf[:buf_len.value])
            print(f"[*] XpalGetConsoleCertificate   : res={res:#x}, len={buf_len.value}")
            if cert_bytes:
                print(f"    Raw Cert Hex (first 64 bytes): {cert_bytes[:64].hex()}")
        except Exception as e:
            print(f"[-] XpalGetConsoleCertificate   : error {e}")

    # Host OS Information
    if hasattr(xpal, "XpalGetHostOsInformation"):
        try:
            fn = xpal.XpalGetHostOsInformation
            buf = (ctypes.c_ubyte * 256)()
            res = fn(buf)
            print(f"[*] XpalGetHostOsInformation    : res={res:#x}")
            raw = bytes(buf)
            print(f"    Raw HostOS bytes (first 32) : {raw[:32].hex()}")
        except Exception as e:
            print(f"[-] XpalGetHostOsInformation    : error {e}")

    # Check Capabilities by Bit (0 to 31)
    if hasattr(xpal, "XpalIsCapabilityEnabled"):
        fn = xpal.XpalIsCapabilityEnabled
        fn.restype = ctypes.c_bool
        fn.argtypes = [ctypes.c_uint32]
        enabled_caps = []
        for bit in range(64):
            try:
                if fn(bit):
                    enabled_caps.append(bit)
            except:
                pass
        print(f"[*] Enabled Capabilities (bits) : {enabled_caps}")

if __name__ == '__main__':
    main()
