import ctypes
import struct

xpal = ctypes.WinDLL("xpal.dll")
val = xpal.XpalGetHostOsInformation()
print(f"[+] XpalGetHostOsInformation: {val:#010x}")
# Low 16 bits = OS build / type (0x000A = 10)
# High 16 bits = Silicon Stepping / Host Tier (0x65F4 = Anaconda Host Root)

# Check XGetConsoleMode vs XpalGetConsoleMode
print(f"[+] XGetConsoleMode():     {xpal.XGetConsoleMode():#x}")
print(f"[+] XGetServerType():      {xpal.XGetServerType():#x}")
print(f"[+] XGetSystemType():      {xpal.XGetSystemType():#x}")
print(f"[+] XGetGenerationType():  {xpal.XGetGenerationType():#x}")

