import os, subprocess

print("System PATH:", os.environ.get("PATH"))
print("\nRunning inspect_xro_exports.py:")
print(subprocess.getoutput(r"D:\DevelopmentFiles\python\python.exe D:\DevelopmentFiles\inspect_xro_exports.py"))
