@echo off
set LOG=D:\DevelopmentFiles\mpid.log
echo === MANUFACTURING ID UPDATE === >> %LOG%

rem Set Manufacturing ID to MSIX:8001 via xpal
D:\DevelopmentFiles\LooseApps\pkg\python.exe -c "
import ctypes, os
xpal = ctypes.CDLL('D:/DevelopmentFiles/LooseApps/pkg/libxpal.so')
buf = ctypes.create_string_buffer(64)
xpal.xpal_get_xconfig_string(2, buf, 64)
old = buf.value.decode().rstrip('\x00')
print(f'Old M-PID: {old}')
xpal.xpal_set_xconfig_string(2, b'MSIX:8001', 10)
xpal.xpal_get_xconfig_string(2, buf, 64)
new = buf.value.decode().rstrip('\x00')
print(f'New M-PID: {new}')
" >> %LOG% 2>&1

echo === DONE === >> %LOG%