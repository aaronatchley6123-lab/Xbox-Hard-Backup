import ctypes

def main():
    print("[*] Probing Factory and Service Processor modes in xpal.dll...", flush=True)
    xpal = ctypes.WinDLL("xpal.dll")
    
    if hasattr(xpal, "XpalIsFactorySettingEnabled"):
        fn = xpal.XpalIsFactorySettingEnabled
        fn.restype = ctypes.c_bool
        fn.argtypes = [ctypes.c_uint32]
        enabled_factory = []
        for i in range(128):
            try:
                if fn(i):
                    enabled_factory.append(i)
            except Exception:
                pass
        print(f"[*] XpalIsFactorySettingEnabled active IDs: {enabled_factory}", flush=True)

    if hasattr(xpal, "XpalGetFactorySettings"):
        fn = xpal.XpalGetFactorySettings
        buf = (ctypes.c_ubyte * 512)()
        buf_size = ctypes.c_uint32(512)
        try:
            res = fn(buf, ctypes.byref(buf_size))
            print(f"[*] XpalGetFactorySettings res: {res:#x}, size: {buf_size.value}", flush=True)
            if buf_size.value > 0:
                print(f"    Raw bytes: {bytes(buf[:buf_size.value]).hex()}", flush=True)
        except Exception as e:
            print(f"[-] XpalGetFactorySettings error: {e}", flush=True)

    # Check XpalIsFeatureEnabled
    if hasattr(xpal, "XpalIsFeatureEnabled"):
        fn = xpal.XpalIsFeatureEnabled
        fn.restype = ctypes.c_bool
        fn.argtypes = [ctypes.c_uint32]
        enabled_features = []
        for feat in range(64):
            try:
                if fn(feat):
                    enabled_features.append(feat)
            except Exception:
                pass
        print(f"[*] XpalIsFeatureEnabled active IDs: {enabled_features}", flush=True)

if __name__ == '__main__':
    main()
