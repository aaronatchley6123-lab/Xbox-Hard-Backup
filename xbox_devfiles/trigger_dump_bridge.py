import socket

s = socket.socket()
s.settimeout(15.0)
s.connect(("127.0.0.1", 1984))

cmd = "D:\\DevelopmentFiles\\python.exe D:\\DevelopmentFiles\\dump_raw_16_19.py"
req = f"D:\\DevelopmentFiles\n{cmd}\n---HERMES_END---\n"
s.sendall(req.encode("utf-8"))

data = b""
while True:
    try:
        chunk = s.recv(4096)
        if not chunk:
            break
        data += chunk
    except socket.timeout:
        break
s.close()
print(data.decode("utf-8", errors="ignore"))
