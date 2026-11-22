import shutil
for fn in ["toolsautoexec.exe", "xtfextensions.txt", "wdrun.exe", "wdconfig.exe"]:
    shutil.copy2("J:/tools/" + fn, "D:/DevelopmentFiles/" + fn)
with open("J:/tools/xtfextensions.txt", "r", errors="ignore") as f:
    print("=== xtfextensions.txt ===")
    print(f.read())
