import ctypes

try:
    xbl = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\XboxLiveTitleId.dll")
    print("Loaded XboxLiveTitleId.dll successfully")
    print("Exports in XboxLiveTitleId:", [x for x in dir(xbl) if not x.startswith('_')])
except Exception as e:
    print("Error loading XboxLiveTitleId:", e)

