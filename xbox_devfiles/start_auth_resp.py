import subprocess, time, os
logf = open(r"D:\DevelopmentFiles\auth_dns.log", "w")
p = subprocess.Popen(
    [r"D:\DevelopmentFiles\python\python.exe", r"D:\DevelopmentFiles\local_auth_responder.py"],
    cwd=r"D:\DevelopmentFiles",
    stdout=logf,
    stderr=logf,
    creationflags=0x00000008 | 0x00000200,
    close_fds=True,
)
time.sleep(1.0)
print("Started PID:", p.pid, "poll:", p.poll())
print("--- auth_dns.log ---")
print(open(r"D:\DevelopmentFiles\auth_dns.log", "r", errors="ignore").read())
