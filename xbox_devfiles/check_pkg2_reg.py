import winreg

def dump_matching(sub, match_str):
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, sub) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            vals = {}
            for i in range(n_val):
                vn, vv, _ = winreg.EnumValue(k, i)
                vals[vn] = vv
            if any(match_str.lower() in str(v).lower() for v in vals.values()) or match_str.lower() in sub.lower():
                print("=== KEY:", sub)
                for vn, vv in vals.items():
                    print(f"  {vn} = {vv}")
            for i in range(n_sub):
                child = winreg.EnumKey(k, i)
                dump_matching(f"{sub}\\{child}", match_str)
    except Exception:
        pass

for m in ["c5e2524a", "DefaultApp", "XBXOwned.FileExplorer", "3x6fa6seps9ambr6ett4k1hb6xk3ezx1sydptvaagkbv2fry052g"]:
    print("**************************************************")
    print("SEARCHING FOR:", m)
    dump_matching(r"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\StateRepository\Cache", m)
