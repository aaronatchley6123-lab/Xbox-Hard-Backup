@echo off
cd /d D:\DevelopmentFiles
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\vmm_full_control.py"
"D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\run_unattended_direct.py"
start "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\hermes_bridge.py"
