import winreg

def read_val(path, name):
    try:
        k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
        val, _ = winreg.QueryValueEx(k, name)
        winreg.CloseKey(k)
        return val
    except Exception as e:
        return f"<err: {e}>"

print("--- Xbox Live System & Device Info ---")
print("XboxLiveDeviceId:", read_val(r"SOFTWARE\Microsoft\XboxLive", "DeviceId"))
print("Sandbox:", read_val(r"SOFTWARE\Microsoft\XboxLive", "Sandbox"))
print("Environment:", read_val(r"SOFTWARE\Microsoft\XboxLive", "Environment"))
print("ConsoleId:", read_val(r"SYSTEM\XConfig", "ConsoleId"))
print("SerialNumber:", read_val(r"SYSTEM\XConfig", "SerialNumber"))
print("SandboxId (XConfig):", read_val(r"SYSTEM\XConfig", "SandboxId"))
