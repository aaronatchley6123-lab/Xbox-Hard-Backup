import subprocess
try:
    out = subprocess.check_output([r"C:\Windows\System32\xrun.exe"], stderr=subprocess.STDOUT)
    print("xrun out:", out.decode('utf-8', errors='ignore'))
except subprocess.CalledProcessError as e:
    print(f"xrun ret {e.returncode}: {e.output.decode('utf-8', errors='ignore')}")
except Exception as e:
    print(f"xrun err: {e}")
