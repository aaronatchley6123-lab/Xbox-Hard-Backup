import os
import subprocess
import sys

def main():
    print("[*] Testing llama-cli.exe invocation...", flush=True)
    llama_dir = r"D:\DevelopmentFiles\llama"
    env = os.environ.copy()
    env["PATH"] = llama_dir + ";" + env.get("PATH", "")
    
    exe_path = os.path.join(llama_dir, "llama-cli.exe")
    res = subprocess.run([exe_path, "--help"], cwd=llama_dir, capture_output=True, text=True, env=env)
    print("RETURN CODE:", res.returncode, flush=True)
    print("STDOUT:", repr(res.stdout[:300]), flush=True)
    print("STDERR:", repr(res.stderr[:300]), flush=True)

if __name__ == '__main__':
    main()
