import winreg

sids = [
    'S-1-5-21-2702878673-795188819-444038987-1004',
    'S-1-5-21-2702878673-795188819-444038987-1004_Classes',
    'S-1-5-21-2702878673-795188819-444038987-1009',
    'S-1-5-21-2702878673-795188819-444038987-503'
]

def walk_find(hkey, path, target):
    try:
        with winreg.OpenKey(hkey, path) as k:
            n_sub, n_val, _ = winreg.QueryInfoKey(k)
            for i in range(n_val):
                vname, val, _ = winreg.EnumValue(k, i)
                if target in vname.lower() or (isinstance(val, str) and target in val.lower()):
                    print(f"FOUND VAL in {path}\\{vname} = {val}")
            for i in range(n_sub):
                sub = winreg.EnumKey(k, i)
                if target in sub.lower():
                    print(f"FOUND KEY: {path}\\{sub}")
                walk_find(hkey, f"{path}\\{sub}", target)
    except:
        pass

for sid in sids:
    print(f"Checking SID {sid}...")
    walk_find(winreg.HKEY_USERS, sid, "devhome")
    walk_find(winreg.HKEY_USERS, sid, "xbdh")
