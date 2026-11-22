import subprocess

cmd = "J:\\tools\\wdconfig.exe set DefaultApp"
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print("[+] DefaultApp setting help:\n", res.stdout)

# Check all set options containing 'Home' or 'Boot'
cmd2 = "J:\\tools\\wdconfig.exe set"
res2 = subprocess.run(cmd2, shell=True, capture_output=True, text=True)
for chunk in res2.stdout.split("\n\n"):
    if "DefaultApp" in chunk or "ConsoleMode" in chunk or "ConsoleType" in chunk or "DefaultStorageDevice" in chunk:
        print("--------------------------------------------------")
        print(chunk.strip())

