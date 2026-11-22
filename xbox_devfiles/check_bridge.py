import socket, os, subprocess

s = socket.socket()
rc = s.connect_ex(('127.0.0.1', 1984))
print("Port 1984 connect_ex:", rc)
s.close()

for d in ["C:\\", "D:\\", "D:\\Win11\\", "M:\\", "J:\\", "J:\\tools\\", "Q:\\", "S:\\", "X:\\", "Y:\\"]:
    try:
        items = os.listdir(d)
        print(f"Drive {d} -> {len(items)} items (sample: {items[:4]})")
    except Exception as e:
        print(f"Drive {d} -> ERROR: {e}")

print("AppContainer LoopbackCheck for HermesOS:")
print(subprocess.getoutput('CheckNetIsolation.exe LoopbackExempt -s'))
