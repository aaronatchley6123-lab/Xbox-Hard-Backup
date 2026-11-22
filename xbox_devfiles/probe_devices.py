import ctypes
import os

print("[*] Probing Windows Registry for COM / Serial / Hardware ports...")
import winreg

def query_key(hkey, path):
    try:
        with winreg.OpenKey(hkey, path) as key:
            num_subkeys, num_values, _ = winreg.QueryInfoKey(key)
            print(f"[+] Key found: {path} (subkeys: {num_subkeys}, values: {num_values})")
            for i in range(num_values):
                name, val, typ = winreg.EnumValue(key, i)
                print(f"    Value: {name} = {val}")
            for i in range(min(num_subkeys, 10)):
                subkey_name = winreg.EnumKey(key, i)
                print(f"    Subkey: {subkey_name}")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"    {path} -> {e}")

query_key(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DEVICEMAP\SERIALCOMM")
query_key(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\xsmc")
query_key(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\xpal")
query_key(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Xbox")
query_key(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\XboxLive")
