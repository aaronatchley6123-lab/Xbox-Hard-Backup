@echo off
set LOG=D:\DevelopmentFiles\system_success.log
echo ==================================================== > %LOG%
echo [!] UNATTENDED SYSTEM EXECUTION AT %DATE% %TIME% >> %LOG%
whoami >> %LOG% 2>&1
echo ==================================================== >> %LOG%

echo [*] Securing SSH in Manufacturing Mode Whitelist... >> %LOG%
reg add "HKLM\SYSTEM\CurrentControlSet\Control\ManufacturingMode\Default\Services\sshd" /v Start /t REG_DWORD /d 2 /f >> %LOG% 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\ManufacturingMode\Default\Services\ssh-agent" /v Start /t REG_DWORD /d 2 /f >> %LOG% 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Control\ManufacturingMode\Default\Services\SshdBroker" /v Start /t REG_DWORD /d 2 /f >> %LOG% 2>&1

echo [*] Enabling Manufacturing Mode Current=Default... >> %LOG%
reg add "HKLM\SYSTEM\CurrentControlSet\Control\ManufacturingMode" /v Current /t REG_SZ /d Default /f >> %LOG% 2>&1

echo [*] Verification Query: >> %LOG%
reg query "HKLM\SYSTEM\CurrentControlSet\Control\ManufacturingMode" /s >> %LOG% 2>&1

echo [!] UNATTENDED EXECUTION COMPLETED >> %LOG%
