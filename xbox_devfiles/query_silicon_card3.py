import ctypes

xpal = ctypes.cdll.LoadLibrary(r"C:\Windows\System32\xpal.dll")

def call_fn(name, *args):
    fn = getattr(xpal, name, None)
    if not fn: return "<not found>"
    try:
        return hex(fn(*args)) if isinstance(fn(*args), int) else str(fn(*args))
    except Exception as e:
        return f"<err: {e}>"

print("--- Card 3 Silicon & Hardware State ---")
print("XpalGetGenerationType:", call_fn("XpalGetGenerationType"))
print("XpalGetConsoleMode:", call_fn("XpalGetConsoleMode"))
print("XpalGetSouthBridgeType:", call_fn("XpalGetSouthBridgeType"))
print("XpalGetVirtualMachineType:", call_fn("XpalGetVirtualMachineType"))
print("XpalIsExternalDevkit:", call_fn("XpalIsExternalDevkit"))
print("XpalIsInternalDevkit:", call_fn("XpalIsInternalDevkit"))
print("XpalIsHyperVEnabled:", call_fn("XpalIsHyperVEnabled"))
print("XpalGetSmcFirmwareId:", call_fn("XpalGetSmcFirmwareId"))
print("XpalGetSmcVersion:", call_fn("XpalGetSmcVersion"))
print("XpalGetCapabilities:", call_fn("XpalGetCapabilities"))
print("XpalIsFactorySettingEnabled(0):", call_fn("XpalIsFactorySettingEnabled", 0))
print("XpalIsFactorySettingEnabled(1):", call_fn("XpalIsFactorySettingEnabled", 1))
print("XpalIsFactorySettingEnabled(2):", call_fn("XpalIsFactorySettingEnabled", 2))
print("XpalGetHostOsInformation:", call_fn("XpalGetHostOsInformation"))

