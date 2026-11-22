import ctypes
from ctypes import wintypes
import winreg

dds = ctypes.WinDLL("DiagnosticDataSettings.dll")
fn_set = getattr(dds, "TelSetLocalTelemetrySetting", None)
if fn_set:
    fn_set.argtypes = [wintypes.DWORD, ctypes.c_void_p]
    fn_set.restype = ctypes.c_long
    hr = fn_set(3, None)
    print(f"[+] TelSetLocalTelemetrySetting(3): hr=0x{hr & 0xFFFFFFFF:08X}")
else:
    print("[-] TelSetLocalTelemetrySetting not found")

# Also write AllowTelemetry = 3 explicitly to Policy key
for p in [r"Software\Microsoft\Windows\CurrentVersion\Policies\DataCollection", r"Software\Policies\Microsoft\Windows\DataCollection"]:
    try:
        with winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, p, 0, winreg.KEY_SET_VALUE) as k:
            winreg.SetValueEx(k, "AllowTelemetry", 0, winreg.REG_DWORD, 3)
            print(f"[+] Wrote AllowTelemetry=3 to HKLM\\{p}")
    except Exception as e:
        print(f"[-] Err writing to {p}: {e}")

# Verify via TelGetAllAllowedTelemetryTypes and TelGetMaximumAllowedTelemetryLevel
fn_types = getattr(dds, "TelGetAllAllowedTelemetryTypes")
fn_types.argtypes = [ctypes.POINTER(wintypes.DWORD)]
fn_types.restype = ctypes.c_long
val_types = wintypes.DWORD(0)
fn_types(ctypes.byref(val_types))

fn_max = getattr(dds, "TelGetMaximumAllowedTelemetryLevel")
fn_max.argtypes = [ctypes.POINTER(wintypes.DWORD)]
fn_max.restype = ctypes.c_long
val_max = wintypes.DWORD(0)
fn_max(ctypes.byref(val_max))

print(f"[+] Verified State: allowedTypes=0x{val_types.value:X}, maxLevel={val_max.value}")

