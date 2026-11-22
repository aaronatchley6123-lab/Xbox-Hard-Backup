import winreg
import ctypes
from ctypes import wintypes

# 1. Register the CLSID in HKCU\Software\Classes\CLSID
clsid = "{1F849CCE-2546-4B9F-B03E-4004781BDC40}"
key_path = f"Software\\Classes\\CLSID\\{clsid}"
inproc_path = f"{key_path}\\InProcServer32"

try:
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, "SeparateSingleProcessExplorerHost")
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, inproc_path) as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, r"D:\Windows11\Windows\System32\ExplorerFrame.dll")
        winreg.SetValueEx(k, "ThreadingModel", 0, winreg.REG_SZ, "Apartment")
    print("[+] Successfully registered CLSID in HKCU!")
except Exception as e:
    print(f"[-] Registry error: {e}")

# 2. Test CoInitializeEx and CoCreateInstance
class GUID(ctypes.Structure):
    _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]

def parse_guid(s):
    # s = {1F849CCE-2546-4B9F-B03E-4004781BDC40}
    parts = s.strip("{}").split("-")
    g = GUID()
    g.Data1 = int(parts[0], 16)
    g.Data2 = int(parts[1], 16)
    g.Data3 = int(parts[2], 16)
    b1 = bytes.fromhex(parts[3])
    b2 = bytes.fromhex(parts[4])
    all_b = b1 + b2
    for i, b in enumerate(all_b):
        g.Data4[i] = b
    return g

ole32 = ctypes.windll.ole32
ole32.CoInitializeEx(None, 6) # COINIT_APARTMENTTHREADED

rclsid = parse_guid(clsid)
IID_IUnknown = parse_guid("{00000000-0000-0000-C000-000000000046}")
p_unk = ctypes.c_void_p()

hr = ole32.CoCreateInstance(ctypes.byref(rclsid), None, 1, ctypes.byref(IID_IUnknown), ctypes.byref(p_unk))
print(f"[*] CoCreateInstance result: HRESULT 0x{hr & 0xffffffff:08x}, p_unk={hex(p_unk.value) if p_unk.value else 0}")
