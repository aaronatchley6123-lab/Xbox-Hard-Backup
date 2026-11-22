import os
for root in [r"C:\Windows", r"D:\DevelopmentFiles"]:
    for r, d, fs in os.walk(root):
        if "toolsautoexec.exe" in fs:
            print(os.path.join(r, "toolsautoexec.exe"))
