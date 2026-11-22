import ctypes, winreg  
from ctypes import wintypes  
adv = ctypes.windll.advapi32  
k32 = ctypes.windll.kernel32  
class LUID(ctypes.Structure):  
  _fields_ = [("LowPart", wintypes.DWORD), ("HighPart", wintypes.LONG)]  
class LA(ctypes.Structure):  
  _fields_ = [("Luid", LUID), ("Attributes", wintypes.DWORD)]  
class TP(ctypes.Structure):  
  _fields_ = [("Count", wintypes.DWORD), ("Privs", LA * 4)]  
h = wintypes.HANDLE()  
adv.OpenProcessToken(k32.GetCurrentProcess(), 0x28, ctypes.byref(h))  
tp = TP()  
tp.Count = 3  
for i, name in enumerate(["SeRestorePrivilege", "SeBackupPrivilege", "SeTakeOwnershipPrivilege"]):  
  adv.LookupPrivilegeValueW(None, name, ctypes.byref(tp.Privs[i].Luid))  
  tp.Privs[i].Attributes = 2  
adv.AdjustTokenPrivileges(h, False, ctypes.byref(tp), ctypes.sizeof(tp), None, None)  
print("Token privileges adjusted, Err:", k32.GetLastError())  
try:  
  k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon", 0, winreg.KEY_SET_VALUE | 0x02000000)  
  winreg.SetValueEx(k, "AutoAdminLogon", 0, winreg.REG_SZ, "1")  
  winreg.SetValueEx(k, "DefaultUserName", 0, winreg.REG_SZ, "DevToolsUser")  
  winreg.SetValueEx(k, "DefaultPassword", 0, winreg.REG_SZ, "<REDACTED_PASSWORD>")  
  winreg.CloseKey(k)  
  print("SUCCESS: AutoAdminLogon set to 1 for DevToolsUser!")  
except Exception as e:  
  print("Registry write exception:", e)  
