import ctypes
from ctypes import wintypes

xpal = ctypes.windll.LoadLibrary("xpal.dll")

try:
    caps = xpal.XpalGetCapabilities()
    print(f"XpalGetCapabilities() -> 0x{caps:08X} ({caps})")
except Exception as e:
    print(f"XpalGetCapabilities err: {e}")

try:
    # Test individual capabilities 0 to 64
    enabled_caps = []
    for cap_id in range(64):
        if xpal.XpalIsCapabilityEnabled(cap_id):
            enabled_caps.append(cap_id)
    print(f"Enabled Capabilities: {enabled_caps}")
except Exception as e:
    print(f"XpalIsCapabilityEnabled err: {e}")

try:
    # Test feature flags
    enabled_feats = []
    for feat_id in range(64):
        if xpal.XpalIsFeatureEnabled(feat_id):
            enabled_feats.append(feat_id)
    print(f"Enabled Features: {enabled_feats}")
except Exception as e:
    print(f"XpalIsFeatureEnabled err: {e}")
