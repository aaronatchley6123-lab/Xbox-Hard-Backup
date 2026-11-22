import socket

s = socket.socket()
s.settimeout(5)
s.connect(("127.0.0.1", 1984))
payload = "D:\\DevelopmentFiles\n\"D:\\DevelopmentFiles\\LooseApps\\pkg\\python.exe\" -u \"D:\\DevelopmentFiles\\release_hyperv.py\"\n---HERMES_END---\n"
s.sendall(payload.encode("utf-8"))
res = b""
while True:
    try:
        chunk = s.recv(4096)
        if not chunk: break
        res += chunk
    except Exception:
        break
s.close()
print("Hermes Bridge execution output:")
print(res.decode("utf-8", errors="replace"))
