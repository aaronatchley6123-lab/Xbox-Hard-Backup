import ctypes

xpal = ctypes.WinDLL("xpal.dll")
exports = [
    "XpalGetConsoleMode",
    "XpalIsInternalDevkit",
    "XpalIsExternalDevkit",
    "XpalGetSystemType",
    "XpalGetServerType",
    "XpalGetVmType",
    "XpalGetGenerationType",
    "XpalGetCapabilities",
    "XpalGetSouthBridgeType",
    "XpalIsFactorySettingEnabled",
    "XpalGetFactorySettings",
    "XpalIsFeatureEnabled"
]

print("[*] Probing xpal live return values:")
for exp in exports:
    if hasattr(xpal, exp):
        fn = getattr(xpal, exp)
        try:
            val = fn()
            print(f"  {exp}() = {val} ({hex(val) if isinstance(val, int) else val})")
        except Exception as e:
            print(f"  {exp}() = error: {e}")

