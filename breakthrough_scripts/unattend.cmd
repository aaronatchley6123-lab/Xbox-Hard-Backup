@echo off
echo [%date% %time%] Clean Master Boot Sequence Initiated >> D:\DevelopmentFiles\unattend_boot_log.txt
set PATH=C:\Windows\System32;D:\DevelopmentFiles\LooseApps\pkg;D:\Win11\System32;%PATH%

:: 0. Box directories against wiper via XRO
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\box_xro_directories.py" >> D:\DevelopmentFiles\xro_boot.log 2>&1

:: 1. Launch Local DNS & Auth Responder (Port 53 & 80)
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\local_auth_responder.py" >> D:\DevelopmentFiles\auth_boot.log 2>&1

:: 2. Loopback Exemption (Persistent)
C:\Windows\System32\CheckNetIsolation.exe LoopbackExempt -a -n=HermesOS.SeriesX_czgs116rtv2ap >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

:: 3. Launch Background Hermes Bridge
start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py" >> D:\DevelopmentFiles\bridge_live.log 2>&1
if exist "D:\DevelopmentFiles\desktop_server.py" (
    start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\desktop_server.py" >> D:\DevelopmentFiles\desktop_server.log 2>&1
)

:: 4. Register Scratch Package Once
"J:\tools\wdapp.exe" registerscratch "LooseApps\pkg" >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

:: 5. Overlay DevHome
"J:\tools\wdapp.exe" overlayfolder Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe D:\DevelopmentFiles\DevHomeOverlay >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

echo [%date% %time%] Master Boot Sequence Complete >> D:\DevelopmentFiles\unattend_boot_log.txt
