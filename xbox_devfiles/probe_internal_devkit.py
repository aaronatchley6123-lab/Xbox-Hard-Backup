import ctypes

xpal = ctypes.WinDLL("xpal.dll")
# In xpal.dll:
# XpalIsExternalDevkit() -> True on our hardware
# XpalIsInternalDevkit() -> False on our hardware
print(f"[+] XpalIsExternalDevkit(): {xpal.XpalIsExternalDevkit()}")
print(f"[+] XpalIsInternalDevkit(): {xpal.XpalIsInternalDevkit()}")
print(f"[+] XpalGetConsoleMode():   {xpal.XpalGetConsoleMode():#x} ({xpal.XpalGetConsoleMode()})")

