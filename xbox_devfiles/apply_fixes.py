import os, shutil, socket, subprocess, time

# 1. LoopbackExempt for HermesOS + XBXOwned apps
for pfn in [
    "HermesOS.SeriesX_czgs116rtv2ap",
    "XBXOwned.XboxDevKitStudio_czgs116rtv2ap",
    "XBXOwned.FileExplorer_czgs116rtv2ap",
]:
    out = subprocess.getoutput(f"CheckNetIsolation.exe LoopbackExempt -a -n={pfn}")
    print(f"[LoopbackExempt] {pfn}: {out.strip()}")

# 2. Launch hermes_bridge.py detached if port 1984 is not listening
s = socket.socket()
if s.connect_ex(("127.0.0.1", 1984)) != 0:
    s.close()
    logf = open(r"D:\DevelopmentFiles\hermes_bridge.log", "w")
    DETACHED_PROCESS = 0x00000008
    CREATE_NEW_PROCESS_GROUP = 0x00000200
    proc = subprocess.Popen(
        [r"D:\DevelopmentFiles\python\python.exe", r"D:\DevelopmentFiles\hermes_bridge.py"],
        cwd=r"D:\DevelopmentFiles",
        stdout=logf,
        stderr=logf,
        creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
        close_fds=True,
    )
    print(f"[Bridge] Spawned PID {proc.pid}")
    for _ in range(15):
        time.sleep(0.5)
        st = socket.socket()
        if st.connect_ex(("127.0.0.1", 1984)) == 0:
            st.close()
            print("[Bridge] Port 1984 is UP!")
            break
        st.close()
else:
    s.close()
    print("[Bridge] Port 1984 already UP")

# 3. Test live drive listing via port 1984 bridge
try:
    st = socket.socket()
    st.settimeout(5)
    st.connect(("127.0.0.1", 1984))
    st.sendall(b"\ncd /d C:\\ && dir /ad /b\n---HERMES_END---\n")
    res = st.recv(4096).decode("utf-8", errors="ignore")
    st.close()
    print("[Bridge Test C:\\]:", res.strip().splitlines()[:6])
except Exception as e:
    print("[Bridge Test ERR]:", e)

# 4. Terminate cached DevHome so DevHomeOverlay takes effect on next launch
print("[DevHome] Terminating cached instance:", subprocess.getoutput(r"J:\tools\wdapp.exe terminate Microsoft.Xbox.DevHome_1.0.2607.19001_x64__8wekyb3d8bbwe").strip())

# 5. Fix XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap with standalone XboxFileExplorer.exe + SDL2_uwp.dll
fe_dst = r"D:\DevelopmentFiles\WindowsApps\XBXOwned.FileExplorer_1.0.0.0_x64__czgs116rtv2ap"
fe_src = r"D:\DevelopmentFiles\LooseApps\FileExplorer"
if os.path.exists(fe_dst) and os.path.exists(os.path.join(fe_src, "XboxFileExplorer.exe")):
    old_exe = os.path.join(fe_dst, "FileExplorer.exe")
    bak_exe = os.path.join(fe_dst, "FileExplorer.exe.stock.bak")
    if os.path.exists(old_exe) and not os.path.exists(bak_exe):
        shutil.copy2(old_exe, bak_exe)
    shutil.copy2(os.path.join(fe_src, "XboxFileExplorer.exe"), old_exe)
    shutil.copy2(os.path.join(fe_src, "SDL2_uwp.dll"), os.path.join(fe_dst, "SDL2_uwp.dll"))
    print("[FileExplorer] Replaced FileExplorer.exe with standalone XboxFileExplorer.exe + SDL2_uwp.dll")
    print("[FileExplorer ACL]:", subprocess.getoutput(f'icacls "{fe_dst}" /grant "*S-1-15-2-1:(OI)(CI)(RX)" /T').splitlines()[-1])
