import winreg, ctypes
from ctypes import wintypes

# Query RoActivateInstance or RoGetActivationFactory for Microsoft.Xbox.Development.XboxInfoUtilities
# We can also check xbtp.dll or wdbase.dll or System32
import os

print("Checking XboxInfoUtilities exports or dlls...")
for dll_name in [r"C:\Windows\System32\xbtp.dll", r"C:\Windows\System32\wdbase.dll", r"X:\Apps\DevHome\Microsoft.Xbox.Tools.DevHome.dll"]:
    if os.path.exists(dll_name):
        with open(dll_name, "rb") as f:
            d = f.read()
            if b"XboxInfoUtilities" in d or b"CertType" in d:
                print(f"  Found in {dll_name}")

