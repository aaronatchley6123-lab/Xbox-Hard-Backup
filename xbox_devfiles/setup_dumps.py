import winreg, os

# Create dumps dir
dump_dir = r"D:\DevelopmentFiles\Dumps"
os.makedirs(dump_dir, exist_ok=True)

# Register LocalDumps under HKCU
key_path = r"Software\Microsoft\Windows\Windows Error Reporting\LocalDumps"
try:
    key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
    winreg.SetValueEx(key, "DumpFolder", 0, winreg.REG_EXPAND_SZ, dump_dir)
    winreg.SetValueEx(key, "DumpCount", 0, winreg.REG_DWORD, 10)
    winreg.SetValueEx(key, "DumpType", 0, winreg.REG_DWORD, 2) # Full dump
    winreg.CloseKey(key)
    print("LocalDumps configured in HKCU!")
except Exception as e:
    print(f"Error configuring LocalDumps in HKCU: {e}")

