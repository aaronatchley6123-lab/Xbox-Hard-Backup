import ctypes
import os
import sys
from ctypes import wintypes

k32 = ctypes.windll.kernel32
xpal = ctypes.WinDLL("xpal.dll")
flag_addr = xpal._handle + 0x6679
old_prot = wintypes.DWORD(0)
k32.VirtualProtect(ctypes.c_void_p(flag_addr), 1, 0x40, ctypes.byref(old_prot))
ctypes.c_ubyte.from_address(flag_addr).value = 1
k32.VirtualProtect(ctypes.c_void_p(flag_addr), 1, old_prot.value, ctypes.byref(old_prot))

minuser = ctypes.WinDLL("minuser.dll")
minuser.EnableOneCoreTransformMode()
print(f"OneCoreTransformMode active: {minuser.IsOneCoreTransformMode()}")

import subprocess
env = os.environ.copy()
env['PATH'] = r"D:\Windows11\Windows\System32;D:\Windows11\Windows;" + env['PATH']
p = subprocess.run([r"D:\Windows11\Windows\explorerw.exe"], env=env, capture_output=True, text=True)
print(f"explorerw returncode under transform mode: {p.returncode}")
