bridge_path = r"D:\DevelopmentFiles\hermes_bridge.py"
with open(bridge_path, "r") as f:
    code = f.read()

snippet = """
# Define persistent W: DOS device mapping to D:\Windows11
try:
    k32 = ctypes.windll.kernel32
    k32.DefineDosDeviceW(0, "W:", r"\\??\\D:\\Windows11")
    print("[+] W: drive defined in bridge mapping to D:\\Windows11", flush=True)
except Exception as e_w:
    print(f"[-] DefineDosDeviceW note: {e_w}", flush=True)
"""

if 'DefineDosDeviceW(0, "W:"' not in code:
    code = snippet.strip() + "\n" + code
    with open(bridge_path, "w") as f:
        f.write(code)
    print("[+] Added W: definition to top of hermes_bridge.py")
else:
    print("[*] Already present in hermes_bridge.py")
