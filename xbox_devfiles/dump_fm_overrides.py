import winreg

overrides_path = r"SYSTEM\CurrentControlSet\Control\FeatureManagement\Overrides"

with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, overrides_path) as k:
    subkeys, _, _ = winreg.QueryInfoKey(k)
    for i in range(subkeys):
        channel = winreg.EnumKey(k, i)
        print(f"\n=== Overrides Channel [{channel}] ===")
        with winreg.OpenKey(k, channel) as sk:
            n_features, n_vals, _ = winreg.QueryInfoKey(sk)
            print(f"  Total Feature Overrides: {n_features}")
            for j in range(min(50, n_features)):
                feat_id = winreg.EnumKey(sk, j)
                with winreg.OpenKey(sk, feat_id) as fk:
                    vals = {}
                    num_v = winreg.QueryInfoKey(fk)[1]
                    for vi in range(num_v):
                        vn, vv, vt = winreg.EnumValue(fk, vi)
                        vals[vn] = hex(vv) if isinstance(vv, int) else vv
                    print(f"    Feature ID {feat_id}: {vals}")

# Also check ConfigurationInventory
print("\n=== ConfigurationInventory ===")
try:
    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\FeatureManagement\Definitions\ConfigurationInventory") as ck:
        n_c, _, _ = winreg.QueryInfoKey(ck)
        for i in range(n_c):
            cfg_name = winreg.EnumKey(ck, i)
            print(f"  Config: {cfg_name}")
except Exception as e:
    print(f"Err ConfigurationInventory: {e}")

