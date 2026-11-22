import winreg, os

# Look at registry for all distinct EnabledStateOptions currently set in HKLM
options_seen = {}
overrides_path = r"SYSTEM\CurrentControlSet\Control\FeatureManagement\Overrides"
with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, overrides_path) as k:
    subkeys, _, _ = winreg.QueryInfoKey(k)
    for i in range(subkeys):
        ch = winreg.EnumKey(k, i)
        with winreg.OpenKey(k, ch) as sk:
            n_feat, _, _ = winreg.QueryInfoKey(sk)
            for j in range(n_feat):
                fid = winreg.EnumKey(sk, j)
                with winreg.OpenKey(sk, fid) as fk:
                    try:
                        val, _ = winreg.QueryValueEx(fk, "EnabledStateOptions")
                        options_seen[val] = options_seen.get(val, 0) + 1
                    except Exception:
                        pass

print("=== EnabledStateOptions values found in active registry ===")
for opt, count in sorted(options_seen.items()):
    print(f"  0x{opt:08X} ({opt}): count = {count}")

