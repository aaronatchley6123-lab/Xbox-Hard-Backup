import winreg, ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")

# 1. XpalGetConsoleMode
try:
    mode = xpal.XpalGetConsoleMode()
    print(f"[Post-Boot] XpalGetConsoleMode(): 0x{mode:02X} ({mode})")
except Exception as e:
    print(f"[Post-Boot] XpalGetConsoleMode err: {e}")

# 2. XConfig Slot 0xAB
XpalGetXConfig = xpal.XpalGetXConfig
XpalGetXConfig.argtypes = [wintypes.ULONG, ctypes.c_void_p, wintypes.ULONG, ctypes.POINTER(wintypes.ULONG)]
XpalGetXConfig.restype = wintypes.LONG
buf = (ctypes.c_ubyte * 16)()
ret_bytes = wintypes.ULONG(0)
status = XpalGetXConfig(0xAB, buf, 16, ctypes.byref(ret_bytes))
print(f"[Post-Boot] Slot 0xAB: {bytes(buf[:ret_bytes.value]).hex()} (status={status})")

# 3. Registry ConsoleMode
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"System\XConfig\ConsoleMode") as k:
        data, typ = winreg.QueryValueEx(k, "Version1")
        print(f"[Post-Boot] Registry ConsoleMode: {bytes(data).hex()}")
except Exception as e:
    print(f"[Post-Boot] Registry ConsoleMode error: {e}")

# 4. Capabilities
try:
    caps = xpal.XpalGetCapabilities()
    print(f"[Post-Boot] Capabilities: 0x{caps:08X}")
except Exception as e:
    print(f"[Post-Boot] Capabilities err: {e}")
