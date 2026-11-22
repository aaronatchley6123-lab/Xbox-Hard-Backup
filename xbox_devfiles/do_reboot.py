import ctypes
xpal = ctypes.WinDLL("xpal.dll")
xpal.XpalInitiateSystemShutdown(1)
