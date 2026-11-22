import winreg, os, ctypes
from ctypes import wintypes

print("=== Checking Windows Velocity Feature Management ===")
for root_path in [
    r"SYSTEM\CurrentControlSet\Control\FeatureManagement",
    r"SOFTWARE\Microsoft\Windows\CurrentVersion\FeatureManagement",
    r"SOFTWARE\Microsoft\WindowsCustom\FeatureManagement",
]:
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, root_path) as k:
            subkeys, vals, _ = winreg.QueryInfoKey(k)
            print(f"[+] HKLM\\{root_path}: {subkeys} subkeys, {vals} values")
            for i in range(vals):
                print(f"    Value: {winreg.EnumValue(k, i)}")
            for i in range(subkeys):
                sk_name = winreg.EnumKey(k, i)
                print(f"    Subkey: {sk_name}")
                try:
                    with winreg.OpenKey(k, sk_name) as sk:
                        sub2, val2, _ = winreg.QueryInfoKey(sk)
                        print(f"      ({sk_name}) -> {sub2} subkeys, {val2} values")
                        for j in range(val2):
                            print(f"        {winreg.EnumValue(sk, j)}")
                        for j in range(min(10, sub2)):
                            print(f"        Subkey: {winreg.EnumKey(sk, j)}")
                except Exception as e:
                    pass
    except Exception as e:
        print(f"[-] HKLM\\{root_path}: {e}")

# Check ntdll for feature management exports
ntdll = ctypes.WinDLL("ntdll.dll")
fm_exports = [
    "RtlQueryFeatureConfiguration",
    "RtlQueryFeatureConfigurationChangeStamp",
    "RtlRegisterFeatureConfigurationChangeNotification",
    "RtlUnregisterFeatureConfigurationChangeNotification",
    "RtlNotifyFeatureUsage"
]
print("\n=== ntdll Feature Management APIs ===")
for exp in fm_exports:
    fn = getattr(ntdll, exp, None)
    print(f"  {exp}: {'AVAILABLE' if fn else 'NOT FOUND'}")

