@echo off
echo [%date% %time%] Cold-Boot Unattended Sequence Initiated >> D:\DevelopmentFiles\unattend_boot_log.txt

:: 1. Launch Local DNS / Captive Authority Interceptor
start /b cmd /c "python D:\DevelopmentFiles\local_auth_responder.py >> D:\DevelopmentFiles\auth_dns.log 2>&1"

:: 2. Launch Native Hermes Bridge
start /b cmd /c "python D:\DevelopmentFiles\hermes_bridge.py >> D:\DevelopmentFiles\bridge.log 2>&1"

:: 3. Execute CoutureOS Native Direct3D 30s Boot Selector
start /b cmd /c "D:\DevelopmentFiles\couture_boot_menu.exe >> D:\DevelopmentFiles\boot_menu.log 2>&1"

:: 4. LoopbackExempt
CheckNetIsolation LoopbackExempt -a -n=HermesOS.SeriesX_czgs116rtv2ap >> D:\DevelopmentFiles\unattend_boot_log.txt 2>&1
