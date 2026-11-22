import ctypes
from ctypes import wintypes

ntdll = ctypes.WinDLL("ntdll.dll")
fn_query = getattr(ntdll, "RtlQueryFeatureConfiguration")

# Define structure
class RTL_FEATURE_CONFIGURATION(ctypes.Structure):
    _fields_ = [
        ("FeatureId", wintypes.DWORD),
        ("ChangeStamp", wintypes.DWORD),
        ("EnabledState", ctypes.c_uint8),
        ("Variant", ctypes.c_uint8),
        ("VariantPayloadKind", ctypes.c_uint8),
        ("Reserved", ctypes.c_uint8),
        ("VariantPayload", wintypes.DWORD),
    ]

# NTSTATUS RtlQueryFeatureConfiguration(
#     ULONG FeatureId,
#     ULONG ConfigurationKind,
#     PULONG ChangeStamp,
#     PRTL_FEATURE_CONFIGURATION Configuration
# )
fn_query.argtypes = [
    wintypes.DWORD,
    wintypes.DWORD,
    ctypes.POINTER(wintypes.DWORD),
    ctypes.POINTER(RTL_FEATURE_CONFIGURATION)
]
fn_query.restype = wintypes.DWORD

test_ids = [1009012367, 1016592527, 1018018959, 102015119]

print("=== Querying Feature Configurations Live ===")
change_stamp = wintypes.DWORD(0)
config = RTL_FEATURE_CONFIGURATION()

state_names = {0: "Default (0)", 1: "Disabled (1)", 2: "Enabled (2)"}

for fid in test_ids:
    change_stamp.value = 0
    ctypes.memset(ctypes.byref(config), 0, ctypes.sizeof(config))
    status = fn_query(fid, 0, ctypes.byref(change_stamp), ctypes.byref(config))
    print(f"Feature ID {fid}:")
    print(f"  Status:       0x{status:08X}")
    print(f"  ChangeStamp:  0x{change_stamp.value:08X}")
    print(f"  EnabledState: {state_names.get(config.EnabledState, str(config.EnabledState))}")
    print(f"  Variant:      {config.Variant}")
    print(f"  PayloadKind:  {config.VariantPayloadKind}")

