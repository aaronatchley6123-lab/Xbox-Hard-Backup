import ctypes, os, subprocess, time

CREATE_BREAKAWAY_FROM_JOB = 0x01000000
DETACHED_PROCESS = 0x00000008
CREATE_NEW_PROCESS_GROUP = 0x00000200

for flags, label in [
    (CREATE_BREAKAWAY_FROM_JOB | DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, "BREAKAWAY+DETACHED"),
    (DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, "DETACHED_ONLY"),
]:
    try:
        logf = open(r"D:\DevelopmentFiles\hermes_bridge.log", "w")
        p = subprocess.Popen(
            [r"D:\DevelopmentFiles\python\python.exe", r"D:\DevelopmentFiles\hermes_bridge.py"],
            cwd=r"D:\DevelopmentFiles",
            stdout=logf,
            stderr=logf,
            creationflags=flags,
            close_fds=True,
        )
        print(f"[+] Spawned with {label}: PID={p.pid}")
        break
    except Exception as e:
        print(f"[-] {label} failed: {e}")
