with open(r"D:\boot.cmd", "r") as f:
    text = f.read()

# Comment out test_patch_run
text = text.replace(
    'start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\\test_patch_run.py"',
    'REM start /b "" "D:\DevelopmentFiles\LooseApps\pkg\python.exe" "D:\DevelopmentFiles\\test_patch_run.py"'
)

with open(r"D:\boot.cmd", "w") as f:
    f.write(text)

print("[+] boot.cmd cleaned up.")
