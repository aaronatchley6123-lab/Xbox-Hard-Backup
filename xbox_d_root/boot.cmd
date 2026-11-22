@echo off
set LOG=D:\DevelopmentFiles\boot_execution.log
echo ======================================== >> %LOG%
echo [BOOT.CMD] Starting at %DATE% %TIME% >> %LOG%
echo [BOOT.CMD] Running as: %USERNAME% >> %LOG%

echo [BOOT.CMD] Releasing holding partition and setting XConfig... >> %LOG%
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" -u -c "
import ctypes
from ctypes import wintypes
k32 = ctypes.windll.kernel32
xpal = ctypes.WinDLL(r'C:\Windows\System32\xpal.dll')
# Slot 0xAB -> 0x01
buf_ab = (ctypes.c_ubyte * 1)(0x01)
xpal.XpalSetXConfig(0xAB, buf_ab, 1)
# Slot 0x112 -> 1
buf_112 = (ctypes.c_ubyte * 4)(1, 0, 0, 0)
xpal.XpalSetXConfig(0x112, buf_112, 4)
# Release holding partition
h = k32.CreateFileW(r'\\.\xvmctrl', 0xC0000000, 3, None, 3, 0x80, None)
if h != -1:
    in_b = ctypes.create_string_buffer(512)
    out_b = ctypes.create_string_buffer(512)
    dw = wintypes.DWORD(0)
    k32.DeviceIoControl(h, 0x00150280, in_b, 512, out_b, 512, ctypes.byref(dw), None)
    k32.CloseHandle(h)
print('[BOOT.CMD] XPAL + VMM Armed')
" >> %LOG% 2>&1

echo [BOOT.CMD] Unlocking C:\ ... >> %LOG%
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" -u -c "
import ctypes
try:
    xro = ctypes.WinDLL(r'J:\tools\xrofilter.dll')
    mgr = ctypes.create_string_buffer(256)
    xro[1](mgr)
    print('XRO Unlock C:\\:', hex(xro[16](mgr, 'C:\\')))
except Exception as e:
    print('XRO error:', e)
" >> %LOG% 2>&1

echo [BOOT.CMD] Launching Hermes Native Bridge on port 1984... >> %LOG%
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py" >> %LOG% 2>&1

echo [BOOT.CMD] Launching FileExplorer AppX... >> %LOG%
"J:\tools\wdapp.exe" launch c5e2524a-ea46-4f67-841f-6a9465d9d515_cw5n1h2txyewy!App >> %LOG% 2>&1

echo [BOOT.CMD] Launching Windows 11 explorerw with live harness... >> %LOG%
REM REM start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\test_patch_run.py" >> %LOG% 2>&1

echo [BOOT.CMD] Script complete at %DATE% %TIME% >> %LOG%
