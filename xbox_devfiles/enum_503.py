import winreg

sid = "S-1-5-21-2702878673-795188819-444038987-503"
try:
    with winreg.OpenKey(winreg.HKEY_USERS, sid) as k:
        i = 0
        while True:
            try:
                print(f"503 subkey: {winreg.EnumKey(k, i)}")
                i += 1
            except OSError:
                break
except Exception as e:
    print(f"Err opening {sid}: {e}")
