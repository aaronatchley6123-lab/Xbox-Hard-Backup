import ctypes
from ctypes import wintypes
import struct

print("====================================================")
print("[*] Probing Xbox Series X UEFI / Firmware Environment Variables")
print("====================================================")

kernel32 = ctypes.windll.kernel32
GetFirmwareEnvironmentVariableW = kernel32.GetFirmwareEnvironmentVariableW
GetFirmwareEnvironmentVariableW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPVOID, wintypes.DWORD]
GetFirmwareEnvironmentVariableW.restype = wintypes.DWORD

# Standard EFI GUIDs and Microsoft Xbox Specific GUIDs
# GlobalVariable: {8BE4DF61-93CA-11d2-AA0D-00E098032B8C}
# MicrosoftXbox:  {77fa9abd-0359-4d32-bd60-28f4e78f784b}
# XboxFirmware:   {CE66350A-A060-4927-AA53-A0F145F8582B}

guids = [
    ("{8BE4DF61-93CA-11d2-AA0D-00E098032B8C}", "EFI_GLOBAL_VARIABLE"),
    ("{77fa9abd-0359-4d32-bd60-28f4e78f784b}", "MICROSOFT_XBOX_FIRMWARE"),
    ("{CE66350A-A060-4927-AA53-A0F145F8582B}", "XBOX_SECURE_BOOT")
]

vars_to_test = [
    "BootOrder", "BootCurrent", "BootNext", "Timeout", "Boot0001", "Boot0002",
    "SecureBoot", "SetupMode", "OsIndicationsSupported", "OsIndications",
    "ConsoleMode", "VmType", "BootMode", "FactoryMode"
]

buf = (ctypes.c_ubyte * 1024)()

found = 0
for guid, gname in guids:
    for var in vars_to_test:
        bytes_read = GetFirmwareEnvironmentVariableW(var, guid, buf, 1024)
        if bytes_read > 0:
            found += 1
            raw = bytes(buf[:bytes_read])
            print(f"[+] FOUND NVRAM/UEFI VAR: [{gname}] {var} -> Len: {bytes_read} | Hex: {raw.hex()}")

if found == 0:
    err = ctypes.GetLastError()
    print(f"[*] Note: Standard Win32 GetFirmwareEnvironmentVariable returned 0 (Error: {err}, {hex(err)})")
    print("[*] The Xbox NanoVisor hypervisor shields standard UEFI tables from userland, exposing NVRAM via xpal XConfig slots instead.")

print("====================================================")
