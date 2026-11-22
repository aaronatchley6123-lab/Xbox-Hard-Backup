import os

path = r"C:\Windows\System32\boot\autoexec"
try:
    os.makedirs(path, exist_ok=True)
    test_file = os.path.join(path, "01_test.cmd")
    with open(test_file, "w") as f:
        f.write("@echo test\n")
    print(f"[+] Successfully wrote {test_file}")
except Exception as e:
    print(f"[-] Write failed: {e}")
