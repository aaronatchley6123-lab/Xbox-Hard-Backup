import ctypes

xpal = ctypes.WinDLL("xpal.dll")
fn = xpal.XpalIsCapabilityEnabledByVm
fn.restype = ctypes.c_bool
fn.argtypes = [ctypes.c_uint32, ctypes.c_uint32]

print("=== CAPABILITY BITMAP PER VMTYPE ===")
for vm in [0, 1, 2, 6]:
    active = []
    for bit in range(32):
        try:
            if fn(bit, vm):
                active.append(bit)
        except Exception:
            pass
    print(f"  VmType {vm}: Active Bits {active}")

