@echo off
set LOG=D:\DevelopmentFiles\two_pass_system_success.log
set MARK=D:\DevelopmentFiles\two_pass_stage1.done
echo ==================================================== >> %LOG%
echo [%DATE% %TIME%] Two-pass setup start >> %LOG%
whoami /user >> %LOG% 2>&1
whoami >> %LOG% 2>&1
whoami /groups >> %LOG% 2>&1
whoami /priv >> %LOG% 2>&1
if exist %MARK% goto pass2
"D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\install_cert.py" >> %LOG% 2>&1
"D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\add_trusted_publisher.py" >> %LOG% 2>&1
"D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\run_xrounlock.py" >> %LOG% 2>&1
whoami /priv >> %LOG% 2>&1
echo stage1_complete >> %MARK%
"D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\arm_reboot.py" >> %LOG% 2>&1
goto end
:pass2
"D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\vmm_full_control.py" >> %LOG% 2>&1
start /b "" "D:\DevelopmentFiles\python\python.exe" "D:\DevelopmentFiles\hermes_bridge.py" >> %LOG% 2>&1
del /q %MARK% >> %LOG% 2>&1
echo [!] PASS 2 COMPLETE >> %LOG%
:end
