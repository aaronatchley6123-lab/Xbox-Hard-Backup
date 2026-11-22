import subprocess
import sys

def main():
    print("[*] Running MinDeployAppX...", flush=True)
    cmd = [
        r"C:\Windows\System32\MinDeployAppX.exe",
        "/Add",
        r"/PackagePath:D:\DevelopmentFiles\OneCore_Windows_Desktop.msix"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Return code:", res.returncode, flush=True)
    print("STDOUT:\n", res.stdout, flush=True)
    print("STDERR:\n", res.stderr, flush=True)

if __name__ == '__main__':
    main()
