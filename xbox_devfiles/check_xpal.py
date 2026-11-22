import ctypes

xpal = ctypes.windll.LoadLibrary('xpal.dll')
try:
    mode = xpal.XpalGetConsoleMode()
    print(f"XpalGetConsoleMode: 0x{mode:02X} ({mode})")
except Exception as e:
    print(f"XpalGetConsoleMode err: {e}")

try:
    vmtype = xpal.XpalGetConsoleType()
    print(f"XpalGetConsoleType: 0x{vmtype:02X} ({vmtype})")
except Exception as e:
    print(f"XpalGetConsoleType err: {e}")
