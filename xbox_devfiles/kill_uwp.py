
import ctypes, time
from ctypes import wintypes
k32 = ctypes.windll.kernel32
class PE32(ctypes.Structure):
    _fields_ = [("dwSize", wintypes.DWORD),("cntUsage", wintypes.DWORD),("th32ProcessID", wintypes.DWORD),("th32DefaultHeapID", ctypes.c_void_p),("th32ModuleID", wintypes.DWORD),("cntThreads", wintypes.DWORD),("th32ParentProcessID", wintypes.DWORD),("pcPriClassBase", wintypes.LONG),("dwFlags", wintypes.DWORD),("szExeFile", wintypes.WCHAR * 260)]
h = k32.CreateToolhelp32Snapshot(2, 0)
pe = PE32(); pe.dwSize = ctypes.sizeof(pe)
killed = []
if k32.Process32FirstW(h, ctypes.byref(pe)):
    while True:
        if "hermesuwp" in pe.szExeFile.lower():
            hp = k32.OpenProcess(1, False, pe.th32ProcessID)
            if hp:
                k32.TerminateProcess(hp, 0)
                k32.CloseHandle(hp)
                killed.append(pe.th32ProcessID)
        if not k32.Process32NextW(h, ctypes.byref(pe)):
            break
k32.CloseHandle(h)
print("Killed HermesUWPApp PIDs:", killed)
