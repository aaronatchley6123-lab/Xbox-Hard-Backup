import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL('kernel32.dll')

pids = (wintypes.DWORD * 1024)()
cb_needed = wintypes.DWORD()
kernel32.K32EnumProcesses(pids, ctypes.sizeof(pids), ctypes.byref(cb_needed))
num_pids = cb_needed.value // 4

session_pids = {}
for i in range(num_pids):
    pid = pids[i]
    sess = wintypes.DWORD()
    if kernel32.ProcessIdToSessionId(pid, ctypes.byref(sess)):
        s_id = sess.value
        session_pids.setdefault(s_id, []).append(pid)

print("Active Windows Sessions found:")
for s_id, plist in sorted(session_pids.items()):
    print(f"  Session {s_id}: {len(plist)} processes")
    # print some process names
    names = []
    for p in plist[:5]:
        h = kernel32.OpenProcess(0x1000, False, p)
        if h:
            nbuf = (ctypes.c_wchar * 260)()
            sz = wintypes.DWORD(260)
            kernel32.QueryFullProcessImageNameW(h, 0, nbuf, ctypes.byref(sz))
            kernel32.CloseHandle(h)
            names.append(nbuf.value.split("\\")[-1])
        else:
            names.append(f"PID{p}")
    print(f"    Sample: {names}")
