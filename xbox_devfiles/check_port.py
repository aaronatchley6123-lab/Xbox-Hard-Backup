import socket

s = socket.socket()
s.settimeout(2)
try:
    s.connect(("127.0.0.1", 1984))
    print("Port 1984 is OPEN!")
    s.sendall(b"D:\\DevelopmentFiles\nwhoami\n---HERMES_END---\n")
    data = s.recv(1024)
    print("Received:", repr(data.decode(errors='replace')))
except Exception as e:
    print("Error:", e)
finally:
    s.close()
