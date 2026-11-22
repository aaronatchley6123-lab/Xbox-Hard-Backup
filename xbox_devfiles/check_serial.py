import ctypes
from ctypes import wintypes, c_char_p, create_string_buffer, byref

for dll_name in ["xbla.dll", "xblabroker.dll", "xblaconfig.dll"]:
    try:
        dll = ctypes.windll.LoadLibrary(dll_name)
        print(f"[+] Loaded {dll_name}")
        if hasattr(dll, "XblaGetConsoleSerialNumber"):
            buf = create_string_buffer(64)
            ok = dll.XblaGetConsoleSerialNumber(buf)
            print(f"[+] Serial Number from {dll_name}: '{buf.value.decode()}' (result={ok})")
    except Exception as e:
        print(f"[-] {dll_name}: {e}")
