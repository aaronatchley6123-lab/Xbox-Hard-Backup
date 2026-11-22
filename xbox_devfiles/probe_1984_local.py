import socket
c = socket.create_connection(("127.0.0.1", 1984), timeout=3)
c.sendall(b"\nwhoami && ver\n---HERMES_END---\n")
print(c.recv(4096).decode("utf-8", "ignore"))
c.close()
