import os, subprocess

for p in [
    r"D:\DevelopmentFiles\setup.xboxunattend",
    r"D:\setup.xboxunattend",
    r"D:\DevelopmentFiles\system_success.log",
]:
    print("=== FILE:", p, "exists:", os.path.exists(p))
    if os.path.exists(p):
        print(open(p, "r", encoding="utf-8", errors="ignore").read()[:2000])

print("=== J:\\tools\\xro* ===")
print(subprocess.getoutput('dir /b J:\\tools\\*xro*'))
print("=== D:\\DevelopmentFiles\\*xro* ===")
print(subprocess.getoutput('dir /b D:\\DevelopmentFiles\\*xro*'))
