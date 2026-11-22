import ctypes

user32 = ctypes.WinDLL(r"D:\Windows11\Windows\System32\USER3W.dll")
progman = user32.FindWindowW("Progman", None)
proxy = user32.FindWindowW("Proxy Desktop", None)

print(f"FindWindowW('Progman'): {hex(progman)}")
print(f"FindWindowW('Proxy Desktop'): {hex(proxy)}")

