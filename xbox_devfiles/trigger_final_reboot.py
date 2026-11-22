import ctypes
print("[*] Initiating Hardware Reboot into CoutureOS Default Shell...")
xpal = ctypes.WinDLL("xpal.dll")
# Action 1 = Reboot
xpal.XpalInitiateSystemShutdown(1)
