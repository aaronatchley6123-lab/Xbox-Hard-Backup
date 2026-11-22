import winreg

try:
    k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment", 0, winreg.KEY_SET_VALUE)
    print("Successfully opened Environment for writing!")
    winreg.CloseKey(k)
except Exception as e:
    print(f"Failed to open for writing: {e}")
