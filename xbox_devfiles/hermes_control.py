#!/usr/bin/env python3
import ctypes
import os
import subprocess
import socket
import sys

BASE_DIR = r"D:\DevelopmentFiles"
PYTHON_EXE = os.path.join(BASE_DIR, "python.exe")
WDAPP_EXE = r"J:\tools\wdapp.exe"
XRO_DLL = r"J:\tools\xrofilter.dll"
DEFAULT_AUMID = "HermesOS.SeriesX_czgs116rtv2ap!App"

def unlock_xro():
    """Unlocks C:\ write protection via xrofilter.dll"""
    if not os.path.exists(XRO_DLL):
        print(f"[-] {XRO_DLL} not found.")
        return False
    try:
        xro = ctypes.WinDLL(XRO_DLL)
        ctor = getattr(xro, "??0XRoDirectoryManager@@QEAA@XZ")
        unlock = getattr(xro, "?Unlock@XRoDirectoryManager@@QEAAJPEBG@Z")
        ctor.argtypes = [ctypes.c_void_p]
        ctor.restype = ctypes.c_void_p
        unlock.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p]
        unlock.restype = ctypes.c_uint32

        mgr = ctypes.create_string_buffer(128)
        ctor(mgr)
        hr = unlock(mgr, r"C:\Windows\Temp")
        print(f"[+] XRO Unlock returned: 0x{hr:08X}")
        return hr == 0
    except Exception as e:
        print(f"[-] XRO unlock failed: {e}")
        return False

def check_bridge():
    """Checks if hermes_bridge.py is listening on port 1984"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.5)
    open_port = (s.connect_ex(('127.0.0.1', 1984)) == 0)
    s.close()
    return open_port

def start_bridge():
    """Starts hermes_bridge.py in the background if not already active"""
    if check_bridge():
        print("[+] Hermes Bridge is already ACTIVE on port 1984.")
        return True
    print("[*] Starting Hermes Bridge...")
    bridge_script = os.path.join(BASE_DIR, "hermes_bridge.py")
    subprocess.Popen([PYTHON_EXE, bridge_script], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True

def arm_persistence():
    """Arms both toolsautoexec (SYSTEM at boot) and Q:\ Startup (User session)"""
    print("[*] Arming persistent boot hooks...")
    
    # 1. Unattend hook for toolsautoexec (runs as SYSTEM)
    unattend_path = r"D:\unattend.cmd"
    unattend_cmd = f"""@echo off
echo [%date% %time%] Boot initiated >> {BASE_DIR}\\unattend_boot_log.txt
start /b "" "{PYTHON_EXE}" "{BASE_DIR}\\hermes_bridge.py"
"""
    with open(unattend_path, "w") as f:
        f.write(unattend_cmd)
    print(f"[+] Staged {unattend_path} for toolsautoexec.")

    # 2. Q: Startup folder hook for user session
    startup_dir = r"Q:\Users\DevToolsUser\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
    os.makedirs(startup_dir, exist_ok=True)
    loader_path = os.path.join(startup_dir, "dashboard_loader.bat")
    loader_cmd = f"""@echo off
start /b "" "{PYTHON_EXE}" "{BASE_DIR}\\hermes_bridge.py"
timeout /t 3 /nobreak >nul
"{WDAPP_EXE}" launch "{DEFAULT_AUMID}"
"""
    with open(loader_path, "w") as f:
        f.write(loader_cmd)
    print(f"[+] Staged {loader_path} for user auto-start.")

def launch_app(aumid=DEFAULT_AUMID):
    """Launches app via native wdapp.exe"""
    print(f"[*] Launching {aumid} via wdapp...")
    res = subprocess.run([WDAPP_EXE, "launch", "/Show:all", aumid], capture_output=True, text=True)
    print(res.stdout or res.stderr)

def main():
    if len(sys.argv) < 2:
        print("Usage: hermes_controller.py [status | unlock | arm | bridge | launch]")
        return

    cmd = sys.argv[1].lower()
    if cmd == "status":
        print(f"Bridge Port 1984: {'OPEN' if check_bridge() else 'CLOSED'}")
    elif cmd == "unlock":
        unlock_xro()
    elif cmd == "arm":
        arm_persistence()
    elif cmd == "bridge":
        start_bridge()
    elif cmd == "launch":
        aumid = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_AUMID
        launch_app(aumid)
    else:
        print(f"Unknown command: {cmd}")

if __name__ == "__main__":
    main()
