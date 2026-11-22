import ctypes
from ctypes import wintypes

dds = ctypes.WinDLL("DiagnosticDataSettings.dll")

print("=== Probing DiagnosticDataSettings.dll Live on Xbox ===")

# 1. TelGetAllAllowedTelemetryTypes
fn_types = getattr(dds, "TelGetAllAllowedTelemetryTypes", None)
if fn_types:
    fn_types.argtypes = [ctypes.POINTER(wintypes.DWORD)]
    fn_types.restype = ctypes.c_long
    val = wintypes.DWORD(0)
    hr = fn_types(ctypes.byref(val))
    print(f"[+] TelGetAllAllowedTelemetryTypes: hr=0x{hr & 0xFFFFFFFF:08X}, allowedTypes=0x{val.value:X} ({val.value})")

# 2. TelGetMaximumAllowedTelemetryLevel
fn_max = getattr(dds, "TelGetMaximumAllowedTelemetryLevel", None)
if fn_max:
    fn_max.argtypes = [ctypes.POINTER(wintypes.DWORD)]
    fn_max.restype = ctypes.c_long
    val_max = wintypes.DWORD(0)
    hr_max = fn_max(ctypes.byref(val_max))
    print(f"[+] TelGetMaximumAllowedTelemetryLevel: hr=0x{hr_max & 0xFFFFFFFF:08X}, maxLevel={val_max.value}")

# 3. TelGetLocalAllowTelemetryRegPath
fn_path = getattr(dds, "TelGetLocalAllowTelemetryRegPath", None)
if fn_path:
    fn_path.argtypes = []
    fn_path.restype = wintypes.LPCWSTR
    p = fn_path()
    print(f"[+] TelGetLocalAllowTelemetryRegPath: '{p}'")

# 4. TelGetWerTelemetryMode
fn_wer = getattr(dds, "TelGetWerTelemetryMode", None)
if fn_wer:
    fn_wer.argtypes = [ctypes.POINTER(wintypes.DWORD)]
    fn_wer.restype = ctypes.c_long
    val_wer = wintypes.DWORD(0)
    hr_wer = fn_wer(ctypes.byref(val_wer))
    print(f"[+] TelGetWerTelemetryMode: hr=0x{hr_wer & 0xFFFFFFFF:08X}, werMode={val_wer.value}")

# 5. TelIsOsInProcessorMode
fn_proc = getattr(dds, "TelIsOsInProcessorMode", None)
if fn_proc:
    fn_proc.argtypes = [ctypes.POINTER(wintypes.BOOL)]
    fn_proc.restype = ctypes.c_long
    is_proc = wintypes.BOOL(0)
    hr_proc = fn_proc(ctypes.byref(is_proc))
    print(f"[+] TelIsOsInProcessorMode: hr=0x{hr_proc & 0xFFFFFFFF:08X}, isProcessorMode={is_proc.value}")

# 6. TelIsRestrictivePolicySet
fn_restr = getattr(dds, "TelIsRestrictivePolicySet", None)
if fn_restr:
    fn_restr.argtypes = [ctypes.POINTER(wintypes.BOOL)]
    fn_restr.restype = ctypes.c_long
    is_restr = wintypes.BOOL(0)
    hr_restr = fn_restr(ctypes.byref(is_restr))
    print(f"[+] TelIsRestrictivePolicySet: hr=0x{hr_restr & 0xFFFFFFFF:08X}, isRestrictive={is_restr.value}")

