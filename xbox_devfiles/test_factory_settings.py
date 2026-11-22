import ctypes

xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")
pFac = getattr(xpal, "XpalIsFactorySettingEnabled", None)
if pFac:
    for i in range(10):
        try:
            res = pFac(i)
            print(f"XpalIsFactorySettingEnabled({i}) = {res}")
        except Exception as e:
            print(f"XpalIsFactorySettingEnabled({i}) error: {e}")
else:
    print("XpalIsFactorySettingEnabled not found")

