import os, subprocess

print("D:\\DevelopmentFiles\\LooseApps\\pkg\\python.exe exists:", os.path.exists(r"D:\DevelopmentFiles\LooseApps\pkg\python.exe"))
print("D:\\DevelopmentFiles\\python\\python.exe exists:", os.path.exists(r"D:\DevelopmentFiles\python\python.exe"))
print("whoami /all:")
print(subprocess.getoutput("whoami /all"))
