import os
for f in ["test_xro.py", "test_xro_unlock.bat", "test_xro_unlock.py", "xro_write_inproc.bat", "xro_write_inproc.py"]:
    p = os.path.join(r"D:\DevelopmentFiles", f)
    if os.path.exists(p):
        print("=== FILE:", p)
        print(open(p, "r", encoding="utf-8", errors="ignore").read())
