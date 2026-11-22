@echo off
echo [%date% %time%] Cold-Boot Unattended Sequence Initiated >> D:\DevelopmentFiles\unattend_boot_log.txt
set PATH=C:\Windows\System32;D:\DevelopmentFiles\LooseApps\pkg;D:\Win11\System32;%PATH%

:: 1. Loopback Exemption
C:\Windows\System32\CheckNetIsolation.exe LoopbackExempt -a -n=HermesOS.SeriesX_czgs116rtv2ap >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

:: 2. Launch Background Daemons (only if not already running)
if not exist "D:\DevelopmentFiles\bridge_alive.txt" (
    start /b "" "D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\hermes_bridge.py" >> D:\DevelopmentFiles\bridge_live.log 2>&1
)
if exist "D:\DevelopmentFiles\local_auth_responder.py" (
    start /b "" "D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\local_auth_responder.py" >> D:\DevelopmentFiles\auth_dns.log 2>&1
)
if exist "D:\DevelopmentFiles\desktop_server.py" (
    start /b "" "D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\desktop_server.py" >> D:\DevelopmentFiles\desktop_server.log 2>&1
)

:: 3. Register and Launch HermesOS
"J:\tools\wdapp.exe" registerscratch "LooseApps\pkg" >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1
"C:\Windows\System32\SRAcmd.exe" -LaunchApp "HermesOS.SeriesX_czgs116rtv2ap!App" >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1

echo [%date% %time%] Cold-Boot Unattended Sequence Completed >> D:\DevelopmentFiles\unattend_boot_log.txt
